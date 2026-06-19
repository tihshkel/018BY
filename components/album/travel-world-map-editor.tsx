import React, { useCallback, useState } from 'react';
import {
  GestureResponderEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { AppText } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/design-tokens';
import {
  TRAVEL_CONTINENT_PATHS,
  TRAVEL_MAP_COLORS,
  TRAVEL_WORLD_MAP_VIEWBOX,
  type TravelMapMarker,
} from '@/constants/travel-world-map';
import { clampMapMarker } from '@/utils/travelMap';
import { createId } from '@/utils/id';

type TravelWorldMapEditorProps = {
  markers: TravelMapMarker[];
  onChange: (markers: TravelMapMarker[]) => void;
  readOnly?: boolean;
};

export function TravelWorldMapEditor({
  markers,
  onChange,
  readOnly = false,
}: TravelWorldMapEditorProps) {
  const [mapSize, setMapSize] = useState({ width: 1, height: 1 });

  const handleMapPress = useCallback(
    (event: GestureResponderEvent) => {
      if (readOnly) return;
      const { locationX, locationY } = event.nativeEvent;
      const nx = locationX / mapSize.width;
      const ny = locationY / mapSize.height;
      const next = clampMapMarker({ nx, ny });
      onChange([
        ...markers,
        {
          id: createId('map-pin'),
          nx: next.nx,
          ny: next.ny,
        },
      ]);
    },
    [mapSize.height, mapSize.width, markers, onChange, readOnly],
  );

  const handleRemoveMarker = useCallback(
    (markerId: string) => {
      onChange(markers.filter((item) => item.id !== markerId));
    },
    [markers, onChange],
  );

  return (
    <View style={styles.wrap}>
      <AppText variant="titleSm">Карта путешествий</AppText>
      <AppText variant="bodySm" style={styles.hint}>
        {readOnly
          ? 'Отмеченные места отображаются на карте в альбоме'
          : 'Нажмите на карту, чтобы поставить метку. Долгое нажатие на метку — удалить.'}
      </AppText>

      <Pressable
        onPress={handleMapPress}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          if (width > 0 && height > 0) {
            setMapSize({ width, height });
          }
        }}
        style={styles.mapPressable}
        accessibilityRole="button"
        accessibilityLabel="Карта мира — нажмите, чтобы отметить место"
      >
        <Svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${TRAVEL_WORLD_MAP_VIEWBOX.width} ${TRAVEL_WORLD_MAP_VIEWBOX.height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <G>
            {TRAVEL_CONTINENT_PATHS.map((continent) => (
              <Path
                key={continent.id}
                d={continent.d}
                fill={TRAVEL_MAP_COLORS.land}
                stroke={TRAVEL_MAP_COLORS.landStroke}
                strokeWidth={0.6}
              />
            ))}
          </G>
          {markers.map((marker) => {
            const cx = marker.nx * TRAVEL_WORLD_MAP_VIEWBOX.width;
            const cy = marker.ny * TRAVEL_WORLD_MAP_VIEWBOX.height;
            return (
              <G key={marker.id}>
                <Circle
                  cx={cx}
                  cy={cy}
                  r={3.2}
                  fill={TRAVEL_MAP_COLORS.pin}
                  stroke={TRAVEL_MAP_COLORS.pinStroke}
                  strokeWidth={0.8}
                />
              </G>
            );
          })}
        </Svg>

        {!readOnly
          ? markers.map((marker) => (
              <Pressable
                key={`hit-${marker.id}`}
                onLongPress={() => handleRemoveMarker(marker.id)}
                style={[
                  styles.markerHit,
                  {
                    left: `${marker.nx * 100}%`,
                    top: `${marker.ny * 100}%`,
                  },
                ]}
                accessibilityLabel="Удалить метку"
              />
            ))
          : null}
      </Pressable>

      {markers.length > 0 ? (
        <AppText variant="caption" style={styles.count}>
          Меток на карте: {markers.length}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  hint: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
  mapPressable: {
    width: '100%',
    aspectRatio: 2,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: '#FFF8F5',
    borderWidth: 1,
    borderColor: colors.border,
  },
  markerHit: {
    position: 'absolute',
    width: 32,
    height: 32,
    marginLeft: -16,
    marginTop: -16,
  },
  count: {
    color: colors.textSecondary,
  },
});
