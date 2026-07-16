import SwiftUI
import WidgetKit

struct PregnancyEntryView: View {
    @Environment(\.widgetFamily) private var family
    @Environment(\.widgetPalette) private var palette
    let entry: WidgetEntry

    var body: some View {
        Group {
            if let item = entry.snapshot.pregnancy {
                content(item)
            } else {
                WidgetEmptyState(
                    title: "До ПДР",
                    subtitle: "Укажите дату — здесь появится обратный отсчёт дней"
                )
                .widgetURL(WidgetDeepLinks.setPdr)
            }
        }
    }

    @ViewBuilder
    private func content(_ item: WidgetPregnancyItem) -> some View {
        switch family {
        case .systemSmall:
            smallView(item)
        case .systemMedium:
            mediumView(item)
        case .systemLarge:
            largeView(item)
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                VStack(spacing: 0) {
                    Text("\(max(item.daysLeft, 0))")
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                    Text("ПДР")
                        .font(.system(size: 8, weight: .medium))
                }
            }
            .widgetURL(WidgetDeepLinks.pregnancyProject(item))
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 2) {
                Text(WidgetFormatters.daysUntilPdrLabel(item.daysLeft))
                    .font(.system(size: 12, weight: .semibold))
                Text(WidgetFormatters.pregnancyWeekDayLabel(week: item.week, dayInWeek: item.dayInWeek))
                    .font(.system(size: 11))
            }
            .widgetURL(WidgetDeepLinks.pregnancyProject(item))
        default:
            smallView(item)
        }
    }

    private func smallView(_ item: WidgetPregnancyItem) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            WidgetMetricLabel(text: "До ПДР")
            WidgetHeroNumber(text: "\(max(item.daysLeft, 0))", size: 40)
            Text("дней")
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .foregroundStyle(palette.textPrimary)
            Spacer(minLength: 0)
            Text(WidgetFormatters.pregnancyWeekDayLabel(week: item.week, dayInWeek: item.dayInWeek))
                .font(.system(size: 11, weight: .regular))
                .foregroundStyle(palette.textSecondary)
        }
        .widgetCardBackground()
        .widgetURL(WidgetDeepLinks.pregnancyProject(item))
    }

    private func mediumView(_ item: WidgetPregnancyItem) -> some View {
        HStack(alignment: .top, spacing: 14) {
            VStack(alignment: .leading, spacing: 6) {
                WidgetMetricLabel(text: "До ПДР")
                WidgetHeroNumber(text: "\(max(item.daysLeft, 0))", size: 40)
                Text(WidgetFormatters.daysUntilPdrLabel(item.daysLeft).replacingOccurrences(of: "\(max(item.daysLeft, 0)) ", with: ""))
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(palette.textPrimary)
            }
            Spacer(minLength: 0)
            VStack(alignment: .trailing, spacing: 8) {
                Text("\(item.trimester)-й триместр")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(palette.textSecondary)
                Text(WidgetFormatters.pregnancyWeekDayLabel(week: item.week, dayInWeek: item.dayInWeek))
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(palette.textPrimary)
                    .multilineTextAlignment(.trailing)
                Text(WidgetFormatters.shortDate(item.pdrISO))
                    .font(.system(size: 11, weight: .regular))
                    .foregroundStyle(palette.textSecondary)
                ProgressView(value: Double(min(max(item.week, 0), 42)), total: 42)
                    .tint(WidgetColors.primary)
                    .frame(width: 120)
            }
        }
        .widgetCardBackground()
        .widgetURL(WidgetDeepLinks.pregnancyProject(item))
    }

    private func largeView(_ item: WidgetPregnancyItem) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            WidgetMetricLabel(text: "До предварительной даты родов")
            HStack(alignment: .firstTextBaseline, spacing: 12) {
                WidgetHeroNumber(text: "\(max(item.daysLeft, 0))", size: 52)
                VStack(alignment: .leading, spacing: 4) {
                    Text("дней")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(palette.textPrimary)
                    Text(WidgetFormatters.pregnancyWeekDayLabel(week: item.week, dayInWeek: item.dayInWeek))
                        .font(.system(size: 13, weight: .regular))
                        .foregroundStyle(palette.textSecondary)
                    Text("\(item.trimester)-й триместр · \(WidgetFormatters.shortDate(item.pdrISO))")
                        .font(.system(size: 12, weight: .regular))
                        .foregroundStyle(palette.textSecondary)
                }
            }
            ProgressView(value: Double(min(max(item.week, 0), 42)), total: 42)
                .tint(WidgetColors.primary)
            if let insight = item.weeklyInsight, !insight.isEmpty {
                Text(WidgetFormatters.trimText(insight, maxLength: 160))
                    .font(.system(size: 12, weight: .regular))
                    .foregroundStyle(palette.textSecondary)
                    .lineLimit(3)
            }
        }
        .widgetCardBackground()
        .widgetURL(WidgetDeepLinks.pregnancyProject(item))
    }
}

struct PregnancyWidget: Widget {
    let kind = "PregnancyWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WidgetSnapshotProvider()) { entry in
            PregnancyEntryView(entry: entry)
                .widgetHomeScreenContainer()
        }
        .configurationDisplayName("До ПДР")
        .description("Обратный отсчёт дней до предварительной даты родов.")
        .supportedFamilies([
            .systemSmall,
            .systemMedium,
            .systemLarge,
            .accessoryCircular,
            .accessoryRectangular,
        ])
        .containerBackgroundRemovable(true)
    }
}
