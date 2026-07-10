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
                    title: "Беременность",
                    subtitle: "Создайте альбом в «Мои истории», чтобы видеть день, неделю и PDR"
                )
                .widgetURL(WidgetDeepLinks.createAlbum)
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
                    Text("\(item.day)")
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                    Text("день")
                        .font(.system(size: 8, weight: .medium))
                }
            }
            .widgetURL(WidgetDeepLinks.pregnancyProject(item))
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 2) {
                Text(WidgetFormatters.pregnancyDayLabel(item.day))
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
        VStack(alignment: .leading, spacing: 8) {
            WidgetBrandMark(compact: true)
            Text(WidgetFormatters.pregnancyDayLabel(item.day))
                .font(.system(size: 24, weight: .bold, design: .rounded))
                .foregroundStyle(WidgetColors.primaryDeep)
            Text(WidgetFormatters.pregnancyWeekDayLabel(week: item.week, dayInWeek: item.dayInWeek))
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(palette.textPrimary)
            Text("До PDR: \(max(item.daysLeft, 0)) дн.")
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(palette.textSecondary)
        }
        .widgetCardBackground()
        .widgetURL(WidgetDeepLinks.pregnancyProject(item))
    }

    private func mediumView(_ item: WidgetPregnancyItem) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                WidgetAccentPill(text: "\(item.trimester) триместр")
                Spacer()
                Text(WidgetFormatters.pregnancyDayLabel(item.day))
                    .font(.system(size: 22, weight: .bold, design: .rounded))
                    .foregroundStyle(WidgetColors.primaryDeep)
            }
            Text(WidgetFormatters.pregnancyWeekDayLabel(week: item.week, dayInWeek: item.dayInWeek))
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(palette.textPrimary)
            ProgressView(value: Double(min(max(item.week, 0), 42)), total: 42)
                .tint(WidgetColors.primary)
            if let insight = item.weeklyInsight, !insight.isEmpty {
                Text(WidgetFormatters.trimText(insight, maxLength: 110))
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(palette.textSecondary)
                    .lineLimit(3)
            }
            HStack {
                Text(item.projectTitle)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(palette.textPrimary)
                    .lineLimit(1)
                Spacer()
                Text(WidgetFormatters.shortDate(item.pdrISO))
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(palette.textSecondary)
            }
        }
        .widgetCardBackground()
        .widgetURL(WidgetDeepLinks.pregnancyProject(item))
    }

    private func largeView(_ item: WidgetPregnancyItem) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Дневник беременности")
                .font(.system(size: 18, weight: .bold, design: .rounded))
                .foregroundStyle(palette.textPrimary)
            HStack(alignment: .bottom, spacing: 16) {
                Text("\(item.day)")
                    .font(.system(size: 48, weight: .bold, design: .rounded))
                    .foregroundStyle(WidgetColors.primaryDeep)
                VStack(alignment: .leading, spacing: 4) {
                    Text("день беременности")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(palette.textPrimary)
                    Text(WidgetFormatters.pregnancyWeekDayLabel(week: item.week, dayInWeek: item.dayInWeek))
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(palette.textSecondary)
                    Text("\(item.trimester)-й триместр · до PDR \(max(item.daysLeft, 0)) дн.")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(palette.textSecondary)
                }
            }
            if let insight = item.weeklyInsight, !insight.isEmpty {
                Text(WidgetFormatters.trimText(insight, maxLength: 180))
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(palette.textSecondary)
                    .lineLimit(4)
                    .widgetSectionCard()
            }
            Text(item.projectTitle)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(palette.textPrimary)
            ProgressView(value: Double(min(max(item.week, 0), 42)), total: 42)
                .tint(WidgetColors.primary)
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
        .configurationDisplayName("Беременность")
        .description("Текущий день, неделя и дата PDR.")
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
