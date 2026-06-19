import SwiftUI
import WidgetKit

struct ContinueEntryView: View {
    @Environment(\.widgetFamily) private var family
    let entry: WidgetEntry

    var body: some View {
        Group {
            if let item = entry.snapshot.continueProject {
                content(item)
            } else {
                WidgetEmptyState(
                    title: "Всё заполнено",
                    subtitle: "Откройте приложение или создайте новый альбом"
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
            Text("Продолжить")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(WidgetColors.primary)
            Text(item.pageTitle)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(WidgetColors.textPrimary)
                .lineLimit(2)
            Spacer(minLength: 0)
            HStack {
                Text("\(item.percent)%")
                    .font(.system(size: 11))
                    .foregroundStyle(WidgetColors.textSecondary)
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
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(WidgetColors.textPrimary)
                    .lineLimit(1)
                Text(item.pageTitle)
                    .font(.system(size: 12))
                    .foregroundStyle(WidgetColors.textSecondary)
                    .lineLimit(2)
                Text("Продолжить заполнение")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(WidgetColors.primary)
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
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(WidgetColors.textPrimary)
                    Text(item.projectTitle)
                        .font(.system(size: 13))
                        .foregroundStyle(WidgetColors.textSecondary)
                }
                Spacer()
                WidgetProgressRing(percent: item.percent, lineWidth: 7, size: 72)
            }
            VStack(alignment: .leading, spacing: 6) {
                Text("Следующая страница")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(WidgetColors.textSecondary)
                Text(item.pageTitle)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(WidgetColors.textPrimary)
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(WidgetColors.primarySurface.opacity(0.7))
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
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
    }
}
