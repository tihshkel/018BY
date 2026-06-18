/**
 * Field overrides for holidays_birthday_60 — photo-first pages without generic OCR labels.
 */

const { tzOverride } = require('./pregnancy-60-tz-builders');

function applyHolidaysBirthday60PageFields(pageNumber) {
  switch (pageNumber) {
    case 1:
      return tzOverride({
        title: 'Приглашение',
        pageType: 'photo',
        fields: [],
      });
    default:
      return null;
  }
}

module.exports = {
  applyHolidaysBirthday60PageFields,
};
