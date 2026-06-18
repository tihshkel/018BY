/**
 * Field/photo builders for diary_interior_purple (A5 Girls Diary 40 pages).
 * Reuses diary-60-tz-builders with A5 template name mapping.
 */

const { applyDiary60TzManifest } = require('./diary-60-tz-builders');

const A5_TEMPLATE_MAP = {
  DayDiaryTemplate: 'MyDayTemplate',
  FriendsQuestionnaireTemplate: 'FriendQuestionnaireTemplate',
  StaticPageTemplate: 'StaticPageTemplate',
  DiaryOwnerTemplate: 'DiaryOwnerTemplate',
  PhotoPageWithTitleTemplate: 'PersonalPhotoTemplate',
  UserQuestionnaireTemplate: 'UserQuestionnaireTemplate',
  ParentQuestionnaireTemplate: 'ParentQuestionnaireTemplate',
  HobbyQuestionnaireTemplate: 'HobbyQuestionnaireTemplate',
  PetsQuestionnaireTemplate: 'PetsQuestionnaireTemplate',
  SocialNetworksTemplate: 'SocialNetworksTemplate',
  MoodQuestionnaireTemplate: 'MoodQuestionnaireTemplate',
  StyleQuestionnaireTemplate: 'StyleQuestionnaireTemplate',
  FirstLoveTemplate: 'FirstLoveTemplate',
  SchoolLifeQuestionnaireTemplate: 'SchoolLifeQuestionnaireTemplate',
  WeeklyScheduleTwoDaysTemplate: 'WeeklyScheduleTwoDaysTemplate',
  WeeklyScheduleSundayTemplate: 'WeeklyScheduleSundayTemplate',
};

function applyGirlsDiaryA5TzManifest(pageNumber, slots, tzEntry, lineGuideId) {
  if (!tzEntry) return null;

  const mappedEntry = {
    ...tzEntry,
    template: A5_TEMPLATE_MAP[tzEntry.template] ?? tzEntry.template,
    hasPhoto: tzEntry.hasPhoto || tzEntry.template === 'PhotoPageWithTitleTemplate',
  };

  return applyDiary60TzManifest(pageNumber, slots, mappedEntry, lineGuideId);
}

module.exports = {
  applyGirlsDiaryA5TzManifest,
};
