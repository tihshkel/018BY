/**
 * Даёт UI нарисовать кадр (спиннер кнопки / оверлей) до тяжёлой работы.
 * Как на iOS: только два requestAnimationFrame.
 * InteractionManager на Android намеренно не используем — он откладывал
 * router.push и сталкивал навигацию с decode первого кадра preview.
 */
export function yieldToNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}
