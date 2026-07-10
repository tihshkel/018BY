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
                    subtitle: "Откройте «Мои истории» для нового альбома"
                )
                .widgetURL(WidgetDeepLinks.createAlbum)
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
            WidgetBrandMark(compact: true)
            WidgetAccentPill(text: "Продолжить")
            Text(item.pageTitle)
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .foregroundStyle(palette.textPrimary)
                .lineLimit(2)
            Spacer(minLength: 0)
            HStack {
                Text("\(item.percent)% готово")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(palette.textSecondary)
                Spacer()
                WidgetProgressRing(percent: item.percent, lineWidth: 4, size: 36)
            }
        }
        .widgetCardBackground()
        .widgetURL(WidgetDeepLinks.continueProject(item))
    }

    private func mediumView(_ item: WidgetContinueItem) -> some View {
        HStack(spacing: 14) {
            WidgetProgressRing(percent: item.percent, lineWidth: 6, size: 64)
            VStack(alignment: .leading, spacing: 6) {
                Text(item.projectTitle)
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .foregroundStyle(palette.textPrimary)
                    .lineLimit(1)
                Text(item.pageTitle)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(palette.textSecondary)
                    .lineLimit(2)
                Text("Открыть страницу")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(WidgetColors.primaryDeep)
            }
            Spacer(minLength: 0)
        }
        .widgetCardBackground()
        .widgetURL(WidgetDeepLinks.continueProject(item))
    }

    private func largeView(_ item: WidgetContinueItem) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Продолжить заполнение")
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                        .foregroundStyle(palette.textPrimary)
                    Text(item.projectTitle)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(palette.textSecondary)
                }
                Spacer()
                WidgetProgressRing(percent: item.percent, lineWidth: 7, size: 72)
            }
            VStack(alignment: .leading, spacing: 6) {
                Text("Следующая страница")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(palette.textSecondary)
                Text(item.pageTitle)
                    .font(.system(size: 15, weight: .bold, design: .rounded))
                    .foregroundStyle(palette.textPrimary)
            }
            .widgetSectionCard()
        }
        .widgetCardBackground()
        .widgetURL(WidgetDeepLinks.continueProject(item))
    }

    private func accessoryRectangular(_ item: WidgetContinueItem) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("018BY · \(item.percent)%")
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
        .description("Быстро вернуться к незаполненной странице.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular])
        .containerBackgroundRemovable(true)
    }
}
