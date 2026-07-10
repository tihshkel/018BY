import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
} from 'react';
import { StyleSheet, View } from 'react-native';

import { AlbumPageFillForm } from '@/components/album/album-page-fill-form';
import { AlbumPageUnifiedEditor } from '@/components/album/album-page-unified-editor';
import { PageFontPicker } from '@/components/album/page-font-picker';
import { AppText } from '@/components/ui';
import { normalizeAlbumFontId } from '@/constants/album-fonts';
import { isKidsMonthPage } from '@/constants/album-text-margins';
import { useMediaLibraryPermission } from '@/components/media-library-permission-provider';
import { colors, spacing } from '@/constants/design-tokens';
import { useDeferredJson } from '@/hooks/use-deferred-json';
import { useDeferredPhotoCaptions } from '@/hooks/use-deferred-photo-captions';
import { useDeferredRecord, useDeferredText } from '@/hooks/use-deferred-record';
import { useDevRenderCount } from '@/hooks/use-dev-render-count';
import { useAlbumPagePhotoEditor } from '@/hooks/use-album-page-photo-editor';
import type { useStableAlbumProjectActions } from '@/hooks/use-stable-album-project-actions';
import type { FieldTextStyle, PageInstance, PageValues } from '@/types/album-page-schema';
import type { AlbumPageSchema } from '@/types/album-page-schema';
import { usesUnifiedPhotoEditor, hasTypographyEditableContent } from '@/utils/albumPageNavigation';
import { isBlankTemplateLineGuide } from '@/utils/photoPageTemplateManifest';
import { clampFieldInput, clampPageFieldValuesForLayoutFont } from '@/utils/albumFieldLimits';
import { usesTemplateLineTextEditing } from '@/utils/albumImages';
import { FORM_MODAL_MAX_WIDTH, type ResponsiveLayout } from '@/utils/responsive';

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
    projectActions,
    layout,
    getInstanceTitle,
  },
  ref,
) {
  useDevRenderCount('AlbumPageFormEditor');

  const isBlankTemplatePage = isBlankTemplateLineGuide(schema.lineGuideId);
  const isKidsMonthTemplatePage =
    schema.lineGuideId === 'kids_48' &&
    (schema.pageType === 'month_page' || isKidsMonthPage(schema.sourcePageNumber));
  const debounceMs = isBlankTemplatePage ? 500 : isKidsMonthTemplatePage ? 450 : 350;

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

  const handleFieldStyleChange = useCallback(
    (fieldId: string, patch: Partial<FieldTextStyle>) => {
      projectActions.commitPagePatch(instanceId, (prev) => {
        const nextFieldTextStyles = {
          ...prev.fieldTextStyles,
          [fieldId]: {
            ...prev.fieldTextStyles?.[fieldId],
            ...patch,
          },
        };
        const field = schema.fields?.find((item) => item.fieldId === fieldId);
        const nextFields = { ...prev.fields };
        if (field?.type === 'text' && patch.fontSize != null) {
          const raw = nextFields[fieldId] ?? '';
          if (raw) {
            nextFields[fieldId] = clampFieldInput(field, raw, undefined, {
              lineGuideId,
              sourcePageNumber: schema.sourcePageNumber,
              fontId: prev.textFontFamily,
              fontSize: nextFieldTextStyles[fieldId]?.fontSize,
            });
          }
        }
        return {
          ...prev,
          fieldTextStyles: nextFieldTextStyles,
          fields: nextFields,
        };
      });
    },
    [instanceId, lineGuideId, projectActions, schema],
  );

  const handleCaptionStyleChange = useCallback(
    (patch: Partial<FieldTextStyle>) => {
      projectActions.commitPagePatch(instanceId, (prev) => ({
        ...prev,
        captionTextStyle: {
          ...prev.captionTextStyle,
          ...patch,
        },
      }));
    },
    [instanceId, projectActions],
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
      projectActions.commitPagePatch(instanceId, (prev) =>
        clampPageFieldValuesForLayoutFont({
          schema,
          values: { ...prev, textFontFamily: fontId },
          lineGuideId,
          fontId,
        }),
      );
    },
    [instanceId, lineGuideId, projectActions, schema],
  );

  const unifiedEditor = usesUnifiedPhotoEditor(schema);
  const showFontPicker =
    (isBlankTemplatePage || usesTemplateLineTextEditing(lineGuideId)) &&
    hasTypographyEditableContent(schema);
  const selectedFontId = normalizeAlbumFontId(editorPageValues.textFontFamily);
  const constrainFormWidth = layout.isTablet && !isBlankTemplatePage;

  const editorBlock = unifiedEditor ? (
    <AlbumPageUnifiedEditor
      schema={schema}
      pageValues={editorPageValues}
      lineGuideId={lineGuideId}
      projectId={projectId}
      instanceId={instanceId}
      onFieldChange={handleFieldChange}
      onFieldStyleChange={handleFieldStyleChange}
      onCaptionStyleChange={handleCaptionStyleChange}
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
          'Заполните нужные поля и добавьте фото. Можно оставить часть пустой — результат увидите на следующем шаге.'}
      </AppText>

      {showFontPicker ? (
        <PageFontPicker value={selectedFontId} onChange={handleFontChange} />
      ) : null}

      <View style={constrainFormWidth ? styles.formContentTablet : undefined}>
        {editorBlock}
      </View>

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
