import React, { useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import {
  PanGestureHandler,
  PinchGestureHandler,
  RotationGestureHandler,
  State,
} from 'react-native-gesture-handler';
import type { FreePhoto, PhotoPosition } from '@/albums';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DraggablePhotoProps {
  photo: FreePhoto;
  onPositionChange: (id: string, position: PhotoPosition) => void;
  onRemove: (id: string) => void;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const DraggablePhoto: React.FC<DraggablePhotoProps> = ({
  photo,
  onPositionChange,
  onRemove,
  isSelected,
  onSelect,
}) => {
  const translateX = useSharedValue(photo.position.x);
  const translateY = useSharedValue(photo.position.y);
  const scale = useSharedValue(photo.position.width / 150); // базовый размер 150px
  const rotation = useSharedValue(photo.position.rotation || 0);

  const panRef = useRef(null);
  const pinchRef = useRef(null);
  const rotationRef = useRef(null);

  const updatePosition = (newPosition: Partial<PhotoPosition>) => {
    const updatedPosition: PhotoPosition = {
      ...photo.position,
      ...newPosition,
    };
    onPositionChange(photo.id, updatedPosition);
  };

  const panGestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      runOnJS(onSelect)(photo.id);
    },
    onActive: (event) => {
      translateX.value = event.translationX + photo.position.x;
      translateY.value = event.translationY + photo.position.y;
    },
    onEnd: () => {
      // Ограничиваем перемещение границами экрана
      const maxX = SCREEN_WIDTH - photo.position.width;
      const maxY = SCREEN_HEIGHT - photo.position.height;
      
      translateX.value = withSpring(
        Math.max(0, Math.min(maxX, translateX.value))
      );
      translateY.value = withSpring(
        Math.max(0, Math.min(maxY, translateY.value))
      );

      runOnJS(updatePosition)({
        x: Math.max(0, Math.min(maxX, translateX.value)),
        y: Math.max(0, Math.min(maxY, translateY.value)),
      });
    },
  });

  const pinchGestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      runOnJS(onSelect)(photo.id);
    },
    onActive: (event) => {
      const newScale = Math.max(0.5, Math.min(3, event.scale * (photo.position.width / 150)));
      scale.value = newScale;
    },
    onEnd: () => {
      const newWidth = scale.value * 150;
      const newHeight = (newWidth * photo.position.height) / photo.position.width;
      
      runOnJS(updatePosition)({
        width: newWidth,
        height: newHeight,
      });
    },
  });

  const rotationGestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      runOnJS(onSelect)(photo.id);
    },
    onActive: (event) => {
      rotation.value = (photo.position.rotation || 0) + event.rotation;
    },
    onEnd: () => {
      runOnJS(updatePosition)({
        rotation: rotation.value,
      });
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}rad` },
    ],
  }));

  const handleRemove = () => {
    onRemove(photo.id);
  };

  return (
    <View style={styles.container}>
      <RotationGestureHandler
        ref={rotationRef}
        simultaneousHandlers={[panRef, pinchRef]}
        onGestureEvent={rotationGestureHandler}
      >
        <Animated.View>
          <PinchGestureHandler
            ref={pinchRef}
            simultaneousHandlers={[panRef, rotationRef]}
            onGestureEvent={pinchGestureHandler}
          >
            <Animated.View>
              <PanGestureHandler
                ref={panRef}
                simultaneousHandlers={[pinchRef, rotationRef]}
                onGestureEvent={panGestureHandler}
              >
                <Animated.View style={[styles.photoContainer, animatedStyle]}>
                  <Image
                    source={{ uri: photo.uri }}
                    style={[
                      styles.photo,
                      {
                        width: photo.position.width,
                        height: photo.position.height,
                      },
                    ]}
                    contentFit="cover"
                    priority="high"
                    cachePolicy="disk"
                    transition={0}
                    fadeDuration={0}
                  />
                  
                  {isSelected && (
                    <>
                      {/* Рамка выделения */}
                      <View style={styles.selectionBorder} />
                      
                      {/* Кнопка удаления */}
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={handleRemove}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                      </TouchableOpacity>
                      
                      {/* Индикаторы углов для изменения размера */}
                      <View style={[styles.resizeHandle, styles.topLeft]} />
                      <View style={[styles.resizeHandle, styles.topRight]} />
                      <View style={[styles.resizeHandle, styles.bottomLeft]} />
                      <View style={[styles.resizeHandle, styles.bottomRight]} />
                    </>
                  )}
                </Animated.View>
              </PanGestureHandler>
            </Animated.View>
          </PinchGestureHandler>
        </Animated.View>
      </RotationGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
  },
  photoContainer: {
    position: 'relative',
  },
  photo: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  selectionBorder: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderWidth: 2,
    borderColor: '#4A90E2',
    borderRadius: 16,
    borderStyle: 'dashed',
  },
  removeButton: {
    position: 'absolute',
    top: -12,
    right: -12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  resizeHandle: {
    position: 'absolute',
    width: 12,
    height: 12,
    backgroundColor: '#4A90E2',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  topLeft: {
    top: -6,
    left: -6,
  },
  topRight: {
    top: -6,
    right: -6,
  },
  bottomLeft: {
    bottom: -6,
    left: -6,
  },
  bottomRight: {
    bottom: -6,
    right: -6,
  },
});

export default DraggablePhoto;
