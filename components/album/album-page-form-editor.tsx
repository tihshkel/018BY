import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { Keyboard, Platform, StyleSheet, View } from 'react-native';

import { AlbumPageFillForm } from '@/components/album/album-page-fill-form';
import { AlbumPageUnifiedEditor } from '@/components/album/album-page-unified-editor';
import { BlankPageEditPreview } from '@/components/album/blank-page-edit-preview';
import { PageFontPicker } from '@/components/album/page-font-picker';
import { AppText } from '@/components/ui';
import { normalizeAlbumFontId } from '@/constants/album-fonts';
import { useMediaLibraryPermission } from '@/components/media-library-permission-provider';
import { colors, spacing } from '@/constants/design-tokens';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useDeferredJson } from '@/hooks/use-deferred-json';
import { useDeferredPhotoCaptions } from '@/hooks/use-deferred-photo-captions';
import { useDeferredRecord, useDeferredText } from '@/hooks/use-deferred-record';
import { useDevRenderCount } from '@/hooks/use-dev-render-count';
import { useAlbumPagePhotoEditor } from '@/hooks/use-album-page-photo-editor';
import type { useStableAlbumProjectActions } from '@/hooks/use-stable-album-project-actions';
import type { PageInstance, PageValues } from '@/types/album-page-schema';
import type { AlbumPageSchema } from '@/types/album-page-schema';
import { hasFormTextInput, usesUnifiedPhotoEditor } from '@/utils/albumPageNavigation';
import { isBlankTemplateLineGuide } from '@/utils/photoPageTemplateManifest';
import { resolveInstancePageImageUri } from '@/utils/resolveInstancePageImage';
import { FORM_MODAL_MAX_WIDTH, type ResponsiveLayout } from '@/utils/responsive';

const PREVIEW_VALUES_DEBOUNCE_MS = 500;

export type AlbumPageFormEditorHandle = {
  flushDrafts: () => void;
  getEditorPageValues: () => PageValues;
};

type ProjectActions = ReturnType<typeof useStableAlbumProjectActions>;

type AlbumPageFormEditorProps = {
  instance: PageInstance;
  schema: AlbumPageSchema;
  pageValues: PageValues;
  instanceId: string;
  lineGuideId: string;
  projectId: string;
  images: string[];
  projectActions: ProjectActions;
  layout: ResponsiveLayout;
  getInstanceTitle: (instance: PageInstance) => string;
};

export const AlbumPageFormEditor = forwardRef<
  AlbumPageFormEditorHandle,
  AlbumPageFormEditorProps
>(function AlbumPageFormEditor(
  {
    instance,
    schema,
    pageValues,
    instanceId,
    lineGuideId,
    projectId,
    images,
    projectActions,
    layout,
    getInstanceTitle,
  },
  ref,
) {
  useDevRenderCount('AlbumPageFormEditor');

  const isBlankTemplatePage = isBlankTemplateLineGuide(schema.lineGuideId);
  const debounceMs = isBlankTemplatePage ? 500 : 350;

  const { draft: draftFields, setField: setDraftField, flush: flushDraftFields } =
    useDeferredRecord(
      instanceId,
      pageValues.fields,
      (fields) => {
        projectActions.commitFields(instanceId, fields);
      },
      { debounceMs },
    );

  const { draft: draftCaption, setText: setDraftCaption, flush: flushDraftCaption } =
    useDeferredText(
      instanceId,
      pageValues.caption ?? '',
      (caption) => {
        projectActions.commitCaption(instanceId, caption);
      },
      { debounceMs },
    );

  const {
    draft: draftPhotoCaptions,
    setCaption: setDraftPhotoCaption,
    flush: flushDraftPhotoCaptions,
  } = useDeferredPhotoCaptions(
    instanceId,
    pageValues.photoCaptions,
    (photoCaptions) => {
      projectActions.commitPhotoCaptions(instanceId, photoCaptions);
    },
    { debounceMs },
  );

  const {
    draft: draftCustomFields,
    replace: replaceDraftCustomFields,
    flush: flushDraftCustomFields,
  } = useDeferredJson(
    instanceId,
    pageValues.customFields ?? [],
    (customFields) => {
      projectActions.commitPagePatch(instanceId, (prev) => ({
        ...prev,
        customFields,
      }));
    },
    { debounceMs },
  );

  const {
    draft: draftFreeElements,
    replace: replaceDraftFreeElements,
    flush: flushDraftFreeElements,
  } = useDeferredJson(
    instanceId,
    pageValues.freeElements ?? [],
    (freeElements) => {
      projectActions.commitPagePatch(instanceId, (prev) => ({
        ...prev,
        freeElements,
      }));
    },
    { debounceMs },
  );

  const editorPageValues = useMemo(
    () => ({
      ...pageValues,
      fields: draftFields,
      caption: draftCaption,
      photoCaptions: draftPhotoCaptions,
      customFields: draftCustomFields,
      freeElements: draftFreeElements,
    }),
    [
      draftCaption,
      draftCustomFields,
      draftFields,
      draftFreeElements,
      draftPhotoCaptions,
      pageValues,
    ],
  );

  const previewPageValues = useDebouncedValue(editorPageValues, PREVIEW_VALUES_DEBOUNCE_MS);

  const flushDrafts = useCallback(() => {
    flushDraftFields();
    flushDraftCaption();
    flushDraftPhotoCaptions();
    flushDraftCustomFields();
    flushDraftFreeElements();
  }, [
    flushDraftCaption,
    flushDraftCustomFields,
    flushDraftFields,
    flushDraftFreeElements,
    flushDraftPhotoCaptions,
  ]);

  useImperativeHandle(
    ref,
    () => ({
      flushDrafts,
      getEditorPageValues: () => editorPageValues,
    }),
    [editorPageValues, flushDrafts],
  );

  const photoEditor = useAlbumPagePhotoEditor({
    instanceId,
    schema,
    pageValues: editorPageValues,
    projectId,
    commitPagePatch: projectActions.commitPagePatch,
  });
  const { ensureMediaLibraryPermission } = useMediaLibraryPermission();

  const handleFieldChange = useCallback(
    (fieldId: string, value: string) => {
      setDraftField(fieldId, value);
    },
    [setDraftField],
  );

  const handleCaptionChange = useCallback(
    (text: string) => {
      setDraftCaption(text);
    },
    [setDraftCaption],
  );

  const handlePhotoCaptionChange = useCallback(
    (slotIndex: number, text: string) => {
      setDraftPhotoCaption(slotIndex, text);
    },
    [setDraftPhotoCaption],
  );

  const handleFreeElementsChange = useCallback(
    (elements: PageValues['freeElements']) => {
      replaceDraftFreeElements(elements ?? []);
    },
    [replaceDraftFreeElements],
  );

  const handleCustomFieldsChange = useCallback(
    (fields: PageValues['customFields']) => {
      replaceDraftCustomFields(fields ?? []);
    },
    [replaceDraftCustomFields],
  );

  const handleFontChange = useCallback(
    (fontId: string) => {
      projectActions.commitPagePatch(instanceId, (prev) => ({
        ...prev,
        textFontFamily: fontId,
      }));
    },
    [instanceId, projectActions],
  );

  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => {
      if (mounted) setKeyboardVisible(true);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      if (mounted) setKeyboardVisible(false);
    });
    return () => {
      mounted = false;
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const unifiedEditor = usesUnifiedPhotoEditor(schema);
  const isTimelinePage = schema.pageType === 'timeline_page';
  const showFontPicker = isBlankTemplatePage && hasFormTextInput(schema);
  const selectedFontId = normalizeAlbumFontId(editorPageValues.textFontFamily);
  const useSplitLayout =
    isBlankTemplatePage && layout.isTablet && layout.isLandscape && !layout.isCompactTablet;
  const formBeforePreview = isTimelinePage;
  const pageImageUri = resolveInstancePageImageUri(images, instance);
  const previewMaxWidth = useSplitLayout
    ? Math.min(520, Math.round(layout.contentMaxWidth * 0.52))
    : layout.isTablet
      ? Math.min(480, layout.contentMaxWidth)
      : Math.min(420, layout.contentMaxWidth);
  /** На iPad достаточно места — превью не скрываем при клавиатуре. */
  const collapsePreview =
    isBlankTemplatePage &&
    keyboardVisible &&
    !layout.isTablet &&
    !isTimelinePage;
  const constrainFormWidth =
    layout.isTablet && !useSplitLayout && !isBlankTemplatePage;

  const editorBlock = unifiedEditor ? (
    <AlbumPageUnifiedEditor
      schema={schema}
      pageValues={editorPageValues}
      lineGuideId={lineGuideId}
      projectId={projectId}
      instanceId={instanceId}
      onFieldChange={handleFieldChange}
      onCaptionChange={handleCaptionChange}
      onPhotoCaptionChange={handlePhotoCaptionChange}
      onSelectVariant={photoEditor.handleSelectVariant}
      onPickPhoto={photoEditor.handlePickPhoto}
      onSlotTransformChange={photoEditor.handleSlotTransformChange}
      onGroupTransformChange={photoEditor.handleGroupTransformChange}
      onRemovePhoto={photoEditor.handleRemovePhoto}
      onInitPhotoBlock={photoEditor.handleInitPhotoBlock}
      onFreeElementsChange={handleFreeElementsChange}
      onCustomFieldsChange={handleCustomFieldsChange}
      allowCustomFieldCrud={
        Boolean(instance.addedByUser) &&
        schema.pageType === 'birthday_free_page' &&
        schema.sourcePageNumber >= 7
      }
      ensureMediaLibraryPermission={ensureMediaLibraryPermission}
      showCaption={photoEditor.showCaption}
      showPerPhotoCaptions={photoEditor.showPerPhotoCaptions}
      captionMaxLength={photoEditor.captionMaxLength}
    />
  ) : (
    <AlbumPageFillForm
      schema={schema}
      pageValues={editorPageValues}
      lineGuideId={lineGuideId}
      onFieldChange={handleFieldChange}
      onCaptionChange={handleCaptionChange}
      onPhotoCaptionChange={handlePhotoCaptionChange}
      onSelectVariant={photoEditor.handleSelectVariant}
      onAddPhoto={photoEditor.handlePickPhoto}
      onReplacePhoto={photoEditor.handlePickPhoto}
      onRemovePhoto={photoEditor.handleRemovePhoto}
      showCaption={photoEditor.showCaption}
      showPerPhotoCaptions={photoEditor.showPerPhotoCaptions}
      captionMaxLength={photoEditor.captionMaxLength}
    />
  );

  const fields = schema.fields ?? [];

  return (
    <>
      <AppText variant="titleSm" style={styles.pageTitle}>
        {getInstanceTitle(instance)}
      </AppText>

      <AppText variant="bodySm" style={styles.editHint}>
        {schema.formHint ??
          ((schema.photoBlocks?.length ?? 0) > 0
            ? 'Заполните нужные поля и добавьте фото. Можно оставить часть пустой — результат увидите на следующем шаге.'
            : 'Заполните нужные поля. Можно оставить часть пустой — результат увидите на следующем шаге.')}
      </AppText>

      {showFontPicker ? (
        <PageFontPicker value={selectedFontId} onChange={handleFontChange} />
      ) : null}

      {isBlankTemplatePage ? (
        <View style={[styles.editorShell, useSplitLayout && styles.editorShellSplit]}>
          {formBeforePreview ? (
            <View style={useSplitLayout ? styles.formPane : undefined}>{editorBlock}</View>
          ) : null}
          {!collapsePreview ? (
            <View style={useSplitLayout ? styles.previewPane : undefined}>
              <BlankPageEditPreview
                schema={schema}
                pageValues={previewPageValues}
                imageUri={pageImageUri}
                maxWidth={previewMaxWidth}
                isTablet={layout.isTablet}
              />
            </View>
          ) : null}
          {!formBeforePreview ? (
            <View style={useSplitLayout ? styles.formPane : undefined}>{editorBlock}</View>
          ) : null}
        </View>
      ) : (
        <View style={constrainFormWidth ? styles.formContentTablet : undefined}>
          {editorBlock}
        </View>
      )}

      {fields.length === 0 && !unifiedEditor ? (
        <AppText variant="bodySm" style={styles.emptyHint}>
          На этой странице нет полей для заполнения.
        </AppText>
      ) : null}
    </>
  );
});

const styles = StyleSheet.create({
  pageTitle: {
    color: colors.textSecondary,
  },
  editHint: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
  editorShell: {
    gap: spacing.md,
  },
  editorShellSplit: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.lg,
    width: '100%',
  },
  previewPane: {
    flex: 1.15,
    minWidth: 0,
    alignItems: 'center',
  },
  formPane: {
    flex: 0.85,
    minWidth: 280,
    maxWidth: 400,
  },
  formContentTablet: {
    alignSelf: 'center',
    maxWidth: FORM_MODAL_MAX_WIDTH,
    width: '100%',
  },
  emptyHint: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
});
