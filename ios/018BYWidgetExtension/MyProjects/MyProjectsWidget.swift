import SwiftUI
import WidgetKit

struct MyProjectsEntryView: View {
    @Environment(\.widgetFamily) private var family
    @Environment(\.widgetPalette) private var palette
    let entry: WidgetEntry

    private var projects: [WidgetProjectItem] {
        entry.snapshot.projects
    }

    var body: some View {
        Group {
            if projects.isEmpty {
                WidgetEmptyState(
                    title: "Пока нет проектов",
                    subtitle: "Откройте «Мои истории» и выберите категорию альбома"
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
        let project = projects[0]
        return VStack(alignment: .leading, spacing: 10) {
            WidgetBrandMark(compact: true)
            Text(project.title)
                .font(.system(size: 15, weight: .bold, design: .rounded))
                .foregroundStyle(palette.textPrimary)
                .lineLimit(2)
            Spacer(minLength: 0)
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Заполнено \(project.percent)%")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(palette.textSecondary)
                    if let remaining = project.unfinishedPages, remaining > 0 {
                        Text("Осталось \(remaining) стр.")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(palette.textSecondary)
                    }
                }
                Spacer()
                WidgetProgressRing(percent: project.percent, lineWidth: 5, size: 42)
            }
        }
        .widgetCardBackground()
        .widgetURL(WidgetDeepLinks.albumPages(project: project))
    }

    private var mediumView: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                WidgetBrandMark(compact: true)
                Spacer()
                Text("\(projects.count) проект(ов)")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(palette.textSecondary)
            }
            ForEach(Array(projects.prefix(2)), id: \.id) { project in
                WidgetProjectRow(project: project)
            }
        }
        .widgetCardBackground()
        .widgetURL(WidgetDeepLinks.home)
    }

    private var largeView: some View {
        let columns = family == .systemExtraLarge
            ? [GridItem(.flexible()), GridItem(.flexible())]
            : [GridItem(.flexible())]

        return VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Мои альбомы")
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                        .foregroundStyle(palette.textPrimary)
                    if let name = entry.snapshot.userName {
                        Text("Привет, \(name)")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(palette.textSecondary)
                    }
                }
                Spacer()
                WidgetBrandMark(compact: true)
            }

            if family == .systemExtraLarge {
                LazyVGrid(columns: columns, spacing: 10) {
                    ForEach(Array(projects.prefix(4)), id: \.id) { project in
                        projectTile(project)
                    }
                }
            } else {
                ForEach(Array(projects.prefix(3)), id: \.id) { project in
                    WidgetProjectRow(project: project)
                }
            }
        }
        .widgetCardBackground()
        .widgetURL(WidgetDeepLinks.home)
    }

    private func projectTile(_ project: WidgetProjectItem) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            WidgetProjectRow(project: project)
        }
        .widgetSectionCard(padding: 10)
        .widgetURL(WidgetDeepLinks.albumPages(project: project))
    }
}

struct MyProjectsWidget: Widget {
    let kind = "MyProjectsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WidgetSnapshotProvider()) { entry in
            MyProjectsEntryView(entry: entry)
                .widgetHomeScreenContainer()
        }
        .configurationDisplayName("Мои проекты")
        .description("Обложки и прогресс ваших альбомов.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .systemExtraLarge])
        .containerBackgroundRemovable(true)
    }
}
