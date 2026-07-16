import SwiftUI
import WidgetKit

struct MyProjectsEntryView: View {
    @Environment(\.widgetFamily) private var family
    @Environment(\.widgetPalette) private var palette
    let entry: WidgetEntry

    private var projects: [WidgetProjectItem] {
        entry.snapshot.projects
    }

    private var albumsCount: Int {
        entry.snapshot.albumsCount
    }

    var body: some View {
        Group {
            if albumsCount == 0 {
                WidgetEmptyState(
                    title: "Нет альбомов",
                    subtitle: "Создайте первый альбом в «Мои истории»"
                )
                .widgetURL(WidgetDeepLinks.createAlbum)
            } else {
                content
            }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch family {
        case .systemSmall:
            smallView
        case .systemMedium:
            mediumView
        case .systemLarge, .systemExtraLarge:
            largeView
        default:
            smallView
        }
    }

    private var smallView: some View {
        let avgPercent = projects.isEmpty
            ? 0
            : projects.map(\.percent).reduce(0, +) / projects.count
        return VStack(alignment: .leading, spacing: 8) {
            WidgetMetricLabel(text: "Альбомы")
            WidgetHeroNumber(text: "\(albumsCount)", size: 40)
            Text(WidgetFormatters.albumsCountLabel(albumsCount).replacingOccurrences(of: "\(albumsCount) ", with: ""))
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .foregroundStyle(palette.textPrimary)
            Spacer(minLength: 0)
            HStack {
                Text("Заполнено в среднем")
                    .font(.system(size: 11, weight: .regular))
                    .foregroundStyle(palette.textSecondary)
                Spacer()
                Text("\(avgPercent)%")
                    .font(.system(size: 13, weight: .bold, design: .rounded))
                    .foregroundStyle(WidgetColors.primaryDeep)
            }
        }
        .widgetCardBackground()
        .widgetURL(WidgetDeepLinks.home)
    }

    private var mediumView: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                WidgetMetricLabel(text: "Альбомы")
                Spacer()
                Text(WidgetFormatters.albumsCountLabel(albumsCount))
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .foregroundStyle(WidgetColors.primaryDeep)
            }
            ForEach(Array(projects.prefix(2)), id: \.id) { project in
                WidgetProjectRow(project: project)
            }
        }
        .widgetCardBackground()
        .widgetURL(WidgetDeepLinks.home)
    }

    private var largeView: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(WidgetFormatters.albumsCountLabel(albumsCount))
                        .font(.system(size: 20, weight: .bold, design: .rounded))
                        .foregroundStyle(palette.textPrimary)
                    if let name = entry.snapshot.userName {
                        Text(name)
                            .font(.system(size: 12, weight: .regular))
                            .foregroundStyle(palette.textSecondary)
                    }
                }
                Spacer()
            }

            ForEach(Array(projects.prefix(family == .systemExtraLarge ? 5 : 4)), id: \.id) { project in
                WidgetProjectRow(project: project)
                    .padding(.vertical, 2)
            }
        }
        .widgetCardBackground()
        .widgetURL(WidgetDeepLinks.home)
    }
}

struct MyProjectsWidget: Widget {
    let kind = "MyProjectsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WidgetSnapshotProvider()) { entry in
            MyProjectsEntryView(entry: entry)
                .widgetHomeScreenContainer()
        }
        .configurationDisplayName("Альбомы")
        .description("Сколько альбомов создано и прогресс заполнения.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .systemExtraLarge])
        .containerBackgroundRemovable(true)
    }
}
