import { InteractionManager, Platform } from 'react-native';

/**
 * Даёт UI нарисовать кадр (спиннер кнопки / оверлей) до тяжёлой работы.
 * См. RN Performance: defer expensive onPress with requestAnimationFrame.
 */
export function yieldToNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (Platform.OS === 'android') {
          InteractionManager.runAfterInteractions(finish);
          // Safety: не зависать, если interactions не завершатся.
          setTimeout(finish, 120);
          return;
        }
        finish();
      });
    });
  });
}
