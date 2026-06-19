import SwiftUI
import WidgetKit

struct PregnancyEntryView: View {
    @Environment(\.widgetFamily) private var family
    let entry: WidgetEntry

    var body: some View {
        Group {
            if let item = entry.snapshot.pregnancy {
                content(item)
            } else {
                WidgetEmptyState(
                    title: "Беременность",
                    subtitle: "Создайте альбом беременности, чтобы видеть неделю и PDR"
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
                    Text("\(item.week)")
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                    Text("нед")
                        .font(.system(size: 8, weight: .medium))
                }
            }
            .widgetURL(WidgetDeepLinks.pregnancyProject(item))
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 2) {
                Text("Неделя \(item.week)")
                    .font(.system(size: 12, weight: .semibold))
                Text("PDR: \(WidgetFormatters.shortDate(item.pdrISO))")
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
            Text("\(item.week) неделя")
                .font(.system(size: 22, weight: .bold, design: .rounded))
                .foregroundStyle(WidgetColors.primary)
            Text(item.projectTitle)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(WidgetColors.textPrimary)
                .lineLimit(1)
            Text("До PDR: \(max(item.daysLeft, 0)) дн.")
                .font(.system(size: 11))
                .foregroundStyle(WidgetColors.textSecondary)
        }
        .widgetCardBackground()
        .widgetURL(WidgetDeepLinks.pregnancyProject(item))
    }

    private func mediumView(_ item: WidgetPregnancyItem) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Беременность")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(WidgetColors.textSecondary)
                Spacer()
                Text("\(item.week) нед.")
                    .font(.system(size: 24, weight: .bold, design: .rounded))
                    .foregroundStyle(WidgetColors.primary)
            }
            ProgressView(value: Double(min(max(item.week, 0), 42)), total: 42)
                .tint(WidgetColors.primary)
            HStack {
                Text(item.projectTitle)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(WidgetColors.textPrimary)
                    .lineLimit(1)
                Spacer()
                Text(WidgetFormatters.shortDate(item.pdrISO))
                    .font(.system(size: 11))
                    .foregroundStyle(WidgetColors.textSecondary)
            }
        }
        .widgetCardBackground()
        .widgetURL(WidgetDeepLinks.pregnancyProject(item))
    }

    private func largeView(_ item: WidgetPregnancyItem) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Дневник беременности")
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(WidgetColors.textPrimary)
            HStack(alignment: .bottom, spacing: 16) {
                Text("\(item.week)")
                    .font(.system(size: 48, weight: .bold, design: .rounded))
                    .foregroundStyle(WidgetColors.primary)
                VStack(alignment: .leading, spacing: 4) {
                    Text("неделя")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(WidgetColors.textPrimary)
                    Text("До PDR \(max(item.daysLeft, 0)) дней")
                        .font(.system(size: 12))
                        .foregroundStyle(WidgetColors.textSecondary)
                }
            }
            Text(item.projectTitle)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(WidgetColors.textPrimary)
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
        .description("Текущая неделя и дата PDR.")
        .supportedFamilies([
            .systemSmall,
            .systemMedium,
            .systemLarge,
            .accessoryCircular,
            .accessoryRectangular,
        ])
    }
}
