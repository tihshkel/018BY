import SwiftUI
import WidgetKit

struct ContinueEntryView: View {
    @Environment(\.widgetFamily) private var family
    @Environment(\.widgetPalette) private var palette
    let entry: WidgetEntry

    var body: some View {
        Group {
            if let item = entry.snapshot.continueProject {
                content(item).widgetURL(WidgetDeepLinks.continueProject(item))
            } else {
                WidgetEmptyState(
                    title: entry.snapshot.albumsCount == 0 ? "История начинается с вас" : "Все истории сохранены",
                    subtitle: entry.snapshot.albumsCount == 0 ? "Первое фото, пара слов — и ваш альбом оживает." : "Вернитесь к любимым страницам или начните новую историю.",
                    action: entry.snapshot.albumsCount == 0 ? "Создать альбом" : "Мои альбомы",
                    icon: entry.snapshot.albumsCount == 0 ? "book.closed" : "checkmark.circle"
                ).widgetURL(entry.snapshot.albumsCount == 0 ? WidgetDeepLinks.createAlbum : WidgetDeepLinks.stories)
            }
        }
    }

    @ViewBuilder private func content(_ item: WidgetContinueItem) -> some View {
        switch family {
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 2) {
                Label("Ещё одна страница", systemImage: "book.closed").font(.system(size: 12, weight: .semibold))
                Text(item.pageTitle).font(.system(size: 11)).lineLimit(1)
                Text("\(item.percent)% · \(item.projectTitle)").font(.system(size: 10)).lineLimit(1)
            }
        case .systemMedium: medium(item)
        case .systemLarge: large(item)
        default: small(item)
        }
    }

    private func small(_ item: WidgetContinueItem) -> some View {
        VStack(alignment: .leading, spacing: 7) {
            WidgetHeader(title: "Продолжим?", icon: "book.closed")
            Spacer(minLength: 0)
            Text(item.pageTitle).font(.system(size: 18, weight: .medium, design: .serif)).foregroundStyle(palette.textPrimary)
                .lineLimit(2).fixedSize(horizontal: false, vertical: true).minimumScaleFactor(0.85).layoutPriority(1)
            Text(item.projectTitle).font(.system(size: 11)).foregroundStyle(palette.textSecondary).lineLimit(1)
            Spacer(minLength: 0)
            HStack(spacing: 10) {
                Text("\(min(100, max(0, item.percent)))%").font(.system(size: 10, weight: .medium)).foregroundStyle(palette.textSecondary).monospacedDigit()
                WidgetCallToAction(title: "Продолжить")
            }
        }.widgetCardBackground()
    }

    private func medium(_ item: WidgetContinueItem) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            WidgetHeader(title: "Ещё одна страница", icon: "book.closed")
            HStack(spacing: 12) {
                WidgetAlbumGlyph(size: 48, category: item.celebration ?? "")
                VStack(alignment: .leading, spacing: 4) {
                    Text(item.pageTitle).font(.system(size: 17, weight: .semibold)).foregroundStyle(palette.textPrimary).lineLimit(2)
                    Text(item.projectTitle).font(.system(size: 11)).foregroundStyle(palette.textSecondary).lineLimit(1)
                }
                Spacer(minLength: 0)
                WidgetProgressRing(percent: item.percent, lineWidth: 3, size: 36, category: item.celebration ?? "")
            }
            Spacer(minLength: 0)
            HStack(spacing: 14) {
                Text(item.unfinishedPages.map { WidgetFormatters.remainingPages($0) } ?? "Начните с малого")
                    .font(.system(size: 10)).foregroundStyle(palette.textSecondary).lineLimit(1)
                Spacer(minLength: 0)
                WidgetCallToAction(title: "Продолжить").frame(maxWidth: 106)
            }
        }.widgetCardBackground()
    }

    private func large(_ item: WidgetContinueItem) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            WidgetHeader(title: "Продолжение вашей истории", icon: "book.closed")
            HStack(spacing: 14) {
                WidgetAlbumGlyph(size: 60, category: item.celebration ?? "")
                VStack(alignment: .leading, spacing: 5) {
                    Text(item.projectTitle).font(.system(size: 20, weight: .semibold)).foregroundStyle(palette.textPrimary).lineLimit(2)
                    Text(WidgetFormatters.progressLabel(item)).font(.system(size: 12)).foregroundStyle(palette.textSecondary)
                }
                Spacer(minLength: 0)
            }
            HStack {
                WidgetMetricLabel(text: "Альбом заполнен на \(min(100, max(0, item.percent)))%")
                Spacer(minLength: 4)
                if let remaining = item.unfinishedPages { WidgetAccentPill(text: WidgetFormatters.remainingPages(remaining)) }
            }
            VStack(alignment: .leading, spacing: 6) {
                WidgetMetricLabel(text: "Следующая страница")
                Text(item.pageTitle).font(.system(size: 18, weight: .semibold)).foregroundStyle(palette.textPrimary).lineLimit(2)
                Text(item.actionHint ?? "Добавьте одно воспоминание — этого достаточно, чтобы продолжить.")
                    .font(.system(size: 12)).foregroundStyle(palette.textSecondary).lineLimit(2)
            }.frame(maxWidth: .infinity, alignment: .leading).widgetSectionCard(padding: 10)
            Spacer(minLength: 0)
            WidgetCallToAction(title: "Сохранить ещё одно воспоминание", filled: true)
        }.widgetCardBackground()
    }
}

struct ContinueWidget: Widget {
    let kind = "ContinueWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WidgetSnapshotProvider()) { entry in
            ContinueEntryView(entry: entry).widgetHomeScreenContainer()
        }
        .configurationDisplayName("Ещё одна страница")
        .description("Вернитесь к незаконченной странице и сохраните ещё одно воспоминание.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular])
        .contentMarginsDisabled()
        .containerBackgroundRemovable(true)
    }
}
