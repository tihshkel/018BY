import SwiftUI
import WidgetKit

/// Overview widget: albums count + days to PDR + next date (info-first, not a CTA button).
struct QuickAccessEntryView: View {
    @Environment(\.widgetFamily) private var family
    @Environment(\.widgetPalette) private var palette
    let entry: WidgetEntry

    private var albumsCount: Int { entry.snapshot.albumsCount }
    private var pregnancy: WidgetPregnancyItem? { entry.snapshot.pregnancy }
    private var nextReminder: WidgetReminderItem? { entry.snapshot.nextReminder }
    private var continueItem: WidgetContinueItem? { entry.snapshot.continueProject }

    var body: some View {
        Group {
            switch family {
            case .systemSmall:
                smallView
            case .systemMedium:
                mediumView
            case .accessoryInline:
                Text(inlineText)
                    .font(.system(size: 12, weight: .semibold))
            default:
                smallView
            }
        }
        .widgetURL(primaryURL)
    }

    private var primaryURL: URL {
        if let pregnancy {
            return WidgetDeepLinks.pregnancyProject(pregnancy)
        }
        if let continueItem {
            return WidgetDeepLinks.continueProject(continueItem)
        }
        if albumsCount > 0 {
            return WidgetDeepLinks.home
        }
        return WidgetDeepLinks.setPdr
    }

    private var inlineText: String {
        if let pregnancy {
            return "ПДР · \(WidgetFormatters.daysUntilPdrLabel(pregnancy.daysLeft))"
        }
        return "018BY · \(WidgetFormatters.albumsCountLabel(albumsCount))"
    }

    private var smallView: some View {
        VStack(alignment: .leading, spacing: 8) {
            WidgetMetricLabel(text: "Сводка")
            if let pregnancy {
                WidgetHeroNumber(text: "\(max(pregnancy.daysLeft, 0))", size: 36)
                Text("дней до ПДР")
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .foregroundStyle(palette.textPrimary)
                Text(WidgetFormatters.albumsCountLabel(albumsCount))
                    .font(.system(size: 11, weight: .regular))
                    .foregroundStyle(palette.textSecondary)
            } else {
                WidgetHeroNumber(text: "\(albumsCount)", size: 36)
                Text(WidgetFormatters.albumsCountLabel(albumsCount).replacingOccurrences(of: "\(albumsCount) ", with: ""))
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .foregroundStyle(palette.textPrimary)
                Text(albumsCount == 0 ? "Укажите ПДР в приложении" : "Добавьте ПДР для отсчёта")
                    .font(.system(size: 11, weight: .regular))
                    .foregroundStyle(palette.textSecondary)
                    .lineLimit(2)
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .widgetCardBackground()
    }

    private var mediumView: some View {
        HStack(spacing: 12) {
            metricTile(
                label: "Альбомы",
                value: "\(albumsCount)",
                detail: WidgetFormatters.albumsCountLabel(albumsCount)
            )
            metricTile(
                label: "До ПДР",
                value: pregnancy.map { "\(max($0.daysLeft, 0))" } ?? "—",
                detail: pregnancy.map {
                    WidgetFormatters.pregnancyWeekDayLabel(week: $0.week, dayInWeek: $0.dayInWeek)
                } ?? "Укажите дату"
            )
            metricTile(
                label: "Событие",
                value: nextReminder.map { "\(max($0.daysLeft, 0))" } ?? (continueItem.map { "\($0.percent)%" } ?? "—"),
                detail: nextReminder?.title
                    ?? continueItem?.pageTitle
                    ?? "Нет дат"
            )
        }
        .widgetCardBackground()
    }

    private func metricTile(label: String, value: String, detail: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            WidgetMetricLabel(text: label)
            Text(value)
                .font(.system(size: 28, weight: .bold, design: .rounded))
                .foregroundStyle(WidgetColors.primaryDeep)
                .minimumScaleFactor(0.7)
                .lineLimit(1)
            Text(detail)
                .font(.system(size: 11, weight: .regular))
                .foregroundStyle(palette.textSecondary)
                .lineLimit(2)
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetSectionCard(padding: 10)
    }
}

struct QuickAccessWidget: Widget {
    let kind = "QuickAccessWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WidgetSnapshotProvider()) { entry in
            QuickAccessEntryView(entry: entry)
                .widgetHomeScreenContainer()
        }
        .configurationDisplayName("Сводка")
        .description("Альбомы, дни до ПДР и ближайшая дата — на одном экране.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryInline])
        .containerBackgroundRemovable(true)
    }
}
