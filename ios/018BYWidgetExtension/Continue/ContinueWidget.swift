import SwiftUI
import WidgetKit

struct ContinueEntryView: View {
    @Environment(\.widgetFamily) private var family
    @Environment(\.widgetPalette) private var palette
    let entry: WidgetEntry

    var body: some View {
        Group {
            if let item = entry.snapshot.continueProject {
                content(item)
            } else {
                WidgetEmptyState(
                    title: "Всё заполнено",
                    subtitle: entry.snapshot.albumsCount == 0
                        ? "Создайте альбом, чтобы продолжить здесь"
                        : "Нет незаполненных страниц"
                )
                .widgetURL(
                    entry.snapshot.albumsCount == 0
                        ? WidgetDeepLinks.createAlbum
                        : WidgetDeepLinks.home
                )
            }
        }
    }

    @ViewBuilder
    private func content(_ item: WidgetContinueItem) -> some View {
        switch family {
        case .systemSmall:
            smallView(item)
        case .systemMedium:
            mediumView(item)
        case .systemLarge:
            largeView(item)
        case .accessoryRectangular:
            accessoryRectangular(item)
        default:
            smallView(item)
        }
    }

    private func smallView(_ item: WidgetContinueItem) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            WidgetMetricLabel(text: "Продолжить")
            Text("\(item.percent)%")
                .font(.system(size: 34, weight: .bold, design: .rounded))
                .foregroundStyle(WidgetColors.primaryDeep)
            Text(item.pageTitle)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(palette.textPrimary)
                .lineLimit(2)
            Spacer(minLength: 0)
            Text(item.projectTitle)
                .font(.system(size: 11, weight: .regular))
                .foregroundStyle(palette.textSecondary)
                .lineLimit(1)
        }
        .widgetCardBackground()
        .widgetURL(WidgetDeepLinks.continueProject(item))
    }

    private func mediumView(_ item: WidgetContinueItem) -> some View {
        HStack(spacing: 14) {
            WidgetProgressRing(percent: item.percent, lineWidth: 5, size: 60)
            VStack(alignment: .leading, spacing: 4) {
                WidgetMetricLabel(text: "Следующая страница")
                Text(item.pageTitle)
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .foregroundStyle(palette.textPrimary)
                    .lineLimit(2)
                Text(item.projectTitle)
                    .font(.system(size: 12, weight: .regular))
                    .foregroundStyle(palette.textSecondary)
                    .lineLimit(1)
            }
            Spacer(minLength: 0)
        }
        .widgetCardBackground()
        .widgetURL(WidgetDeepLinks.continueProject(item))
    }

    private func largeView(_ item: WidgetContinueItem) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            WidgetMetricLabel(text: "Продолжить заполнение")
            HStack(alignment: .center, spacing: 16) {
                Text("\(item.percent)%")
                    .font(.system(size: 44, weight: .bold, design: .rounded))
                    .foregroundStyle(WidgetColors.primaryDeep)
                VStack(alignment: .leading, spacing: 4) {
                    Text(item.projectTitle)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(palette.textPrimary)
                    Text(item.pageTitle)
                        .font(.system(size: 13, weight: .regular))
                        .foregroundStyle(palette.textSecondary)
                        .lineLimit(3)
                }
                Spacer(minLength: 0)
            }
            ProgressView(value: Double(min(max(item.percent, 0), 100)), total: 100)
                .tint(WidgetColors.primary)
        }
        .widgetCardBackground()
        .widgetURL(WidgetDeepLinks.continueProject(item))
    }

    private func accessoryRectangular(_ item: WidgetContinueItem) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("\(item.percent)% · продолжить")
                .font(.system(size: 12, weight: .semibold))
            Text(item.pageTitle)
                .font(.system(size: 11))
                .lineLimit(2)
        }
        .widgetURL(WidgetDeepLinks.continueProject(item))
    }
}

struct ContinueWidget: Widget {
    let kind = "ContinueWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WidgetSnapshotProvider()) { entry in
            ContinueEntryView(entry: entry)
                .widgetHomeScreenContainer()
        }
        .configurationDisplayName("Продолжить")
        .description("Прогресс и следующая незаполненная страница.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular])
        .containerBackgroundRemovable(true)
    }
}
