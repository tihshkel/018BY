import SwiftUI
import WidgetKit

struct MyProjectsEntryView: View {
    @Environment(\.widgetFamily) private var family
    @Environment(\.widgetPalette) private var palette
    let entry: WidgetEntry
    private var projects: [WidgetProjectItem] { entry.snapshot.projects }

    var body: some View {
        Group {
            if let project = projects.first {
                switch family {
                case .systemSmall: small(project)
                case .systemMedium: medium
                default: collection
                }
            } else {
                WidgetEmptyState(title: "Ваш первый альбом", subtitle: "Соберите важные моменты в историю, к которой хочется возвращаться.", action: "Выбрать альбом", icon: "square.stack")
                    .widgetURL(WidgetDeepLinks.createAlbum)
            }
        }
    }

    private func small(_ project: WidgetProjectItem) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            WidgetHeader(title: "Мои альбомы", icon: "square.stack")
            Spacer(minLength: 0)
            HStack(spacing: 14) {
                WidgetAlbumGlyph(icon: project.percent >= 100 ? "checkmark" : "heart", size: 38, category: project.category)
                if project.progressKnown != false { WidgetHeroNumber(text: "\(project.percent)%", size: 26) }
                Spacer(minLength: 0)
            }
            Text(project.title).font(.system(size: 13, weight: .semibold)).foregroundStyle(palette.textPrimary)
                .lineLimit(2).fixedSize(horizontal: false, vertical: true).layoutPriority(1)
            Spacer(minLength: 0)
            WidgetCallToAction(title: project.percent >= 100 ? "Листать историю" : "Открыть альбом")
        }.widgetCardBackground().widgetURL(WidgetDeepLinks.albumPages(project: project))
    }

    private var medium: some View {
        VStack(alignment: .leading, spacing: 8) {
            WidgetHeader(title: "Мои альбомы", icon: "square.stack")
            HStack(spacing: 10) {
                ForEach(Array(projects.prefix(2)), id: \.id) { project in
                    Link(destination: WidgetDeepLinks.albumPages(project: project)) {
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                WidgetAlbumGlyph(icon: project.percent >= 100 ? "checkmark" : "heart", size: 30, category: project.category)
                                Spacer(minLength: 4)
                                if project.progressKnown != false {
                                    WidgetProgressRing(percent: project.percent, lineWidth: 2.5, size: 26, category: project.category)
                                }
                            }
                            Text(project.title).font(.system(size: 12, weight: .semibold)).foregroundStyle(palette.textPrimary)
                                .lineLimit(2).fixedSize(horizontal: false, vertical: true)
                            Spacer(minLength: 0)
                            Text(detail(project)).font(.system(size: 10)).foregroundStyle(palette.textSecondary).lineLimit(1)
                        }.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading).widgetSectionCard(padding: 8)
                    }.buttonStyle(.plain).frame(maxWidth: .infinity)
                }
            }
        }.widgetCardBackground().widgetURL(WidgetDeepLinks.stories)
    }

    private var collection: some View {
        VStack(alignment: .leading, spacing: 8) {
            WidgetHeader(title: "Мои альбомы", icon: "square.stack")
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text("Ваши истории").font(.system(size: 22, weight: .medium, design: .serif)).foregroundStyle(palette.textPrimary)
                    .lineLimit(1).minimumScaleFactor(0.85)
                Spacer(minLength: 0)
                WidgetAccentPill(text: WidgetFormatters.albumsCountLabel(entry.snapshot.albumsCount))
            }
            if family == .systemExtraLarge {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                    ForEach(Array(projects.prefix(5)), id: \.id) { project in albumRow(project) }
                }
            } else {
                ForEach(Array(projects.prefix(3)), id: \.id) { project in albumRow(project) }
            }
            Spacer(minLength: 0)
            Link(destination: WidgetDeepLinks.stories) {
                WidgetCallToAction(title: "Все мои истории", filled: true)
            }.buttonStyle(.plain)
        }.widgetCardBackground().widgetURL(WidgetDeepLinks.stories)
    }

    private func albumRow(_ project: WidgetProjectItem) -> some View {
        Link(destination: WidgetDeepLinks.albumPages(project: project)) {
            WidgetProjectRow(project: project).widgetSectionCard(padding: 8)
        }.buttonStyle(.plain)
    }

    private func detail(_ project: WidgetProjectItem) -> String {
        if project.progressKnown == false { return "Первая страница ждёт" }
        if let remaining = project.unfinishedPages, remaining > 0 { return WidgetFormatters.remainingPages(remaining) }
        return project.percent >= 100 ? "История сохранена" : project.categoryLabel
    }
}

struct MyProjectsWidget: Widget {
    let kind = "MyProjectsWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WidgetSnapshotProvider()) { entry in
            MyProjectsEntryView(entry: entry).widgetHomeScreenContainer()
        }
        .configurationDisplayName("Мои альбомы")
        .description("Маленькая коллекция ваших историй. Нажмите на альбом, чтобы открыть его.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .systemExtraLarge])
        .contentMarginsDisabled()
        .containerBackgroundRemovable(true)
    }
}
