import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
// import { BlurView } from 'expo-blur';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FloatingAddButtonProps {
  onAddPhoto: (uri: string, x: number, y: number) => void;
  isVisible: boolean;
}

const FloatingAddButton: React.FC<FloatingAddButtonProps> = ({
  onAddPhoto,
  isVisible,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [animation] = useState(new Animated.Value(0));
  const [tapPosition, setTapPosition] = useState({ x: 0, y: 0 });

  const toggleExpanded = () => {
    const toValue = isExpanded ? 0 : 1;
    setIsExpanded(!isExpanded);
    
    Animated.spring(animation, {
      toValue,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const handleAddPhoto = async (event: any) => {
    // Сохраняем позицию нажатия для размещения фото
    const { locationX, locationY } = event.nativeEvent;
    setTapPosition({ x: locationX, y: locationY });

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Доступ к галерее запрещён', 'Разрешите доступ к галерее для добавления фотографий');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      // Размещаем фото в центре экрана или в позиции нажатия
      const x = Math.max(50, Math.min(SCREEN_WIDTH - 200, tapPosition.x - 75));
      const y = Math.max(50, Math.min(SCREEN_HEIGHT - 200, tapPosition.y - 75));
      
      onAddPhoto(result.assets[0].uri, x, y);
      toggleExpanded();
    }
  };

  const handleCameraPhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Доступ к камере запрещён', 'Разрешите доступ к камере для съёмки фотографий');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      // Размещаем фото в центре экрана
      const x = SCREEN_WIDTH / 2 - 75;
      const y = SCREEN_HEIGHT / 2 - 75;
      
      onAddPhoto(result.assets[0].uri, x, y);
      toggleExpanded();
    }
  };

  if (!isVisible) {
    return null;
  }

  const mainButtonRotation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const galleryButtonTranslate = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -70],
  });

  const cameraButtonTranslate = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -130],
  });

  const buttonScale = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={styles.container}>
      {/* Фоновое затемнение при раскрытии */}
      {isExpanded && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={toggleExpanded}
        />
      )}

      {/* Кнопка камеры */}
      <Animated.View
        style={[
          styles.actionButton,
          styles.cameraButton,
          {
            transform: [
              { translateY: cameraButtonTranslate },
              { scale: buttonScale },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.actionButtonInner}
          onPress={handleCameraPhoto}
          activeOpacity={0.8}
        >
          <Ionicons name="camera" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>

      {/* Кнопка галереи */}
      <Animated.View
        style={[
          styles.actionButton,
          styles.galleryButton,
          {
            transform: [
              { translateY: galleryButtonTranslate },
              { scale: buttonScale },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.actionButtonInner}
          onPress={handleAddPhoto}
          activeOpacity={0.8}
        >
          <Ionicons name="images" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>

      {/* Основная кнопка */}
      <Animated.View
        style={[
          styles.mainButton,
          {
            transform: [{ rotate: mainButtonRotation }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.mainButtonInner}
          onPress={toggleExpanded}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    alignItems: 'center',
    zIndex: 1000,
  },
  overlay: {
    position: 'absolute',
    top: -SCREEN_HEIGHT,
    left: -SCREEN_WIDTH,
    width: SCREEN_WIDTH * 2,
    height: SCREEN_HEIGHT * 2,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  mainButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#C9A89A',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  mainButtonInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
  },
  actionButton: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#8B6F5F',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  actionButtonInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
  },
  galleryButton: {
    bottom: 5,
  },
  cameraButton: {
    bottom: 5,
  },
});

export default FloatingAddButton;
