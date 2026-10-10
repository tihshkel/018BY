import SwiftUI
import WidgetKit

/// Retains the installed widget kind while replacing the generic dashboard with a daily memory prompt.
struct QuickAccessEntryView: View {
    @Environment(\.widgetFamily) private var family
    @Environment(\.widgetPalette) private var palette
    let entry: WidgetEntry
    private var next: WidgetContinueItem? { entry.snapshot.continueProject }
    private var category: String { next?.celebration ?? entry.snapshot.projects.first?.category ?? "" }
    private var prompt: String { WidgetMemoryPrompts.text(for: entry.date, category: category) }
    private var destination: URL {
        if let next { return WidgetDeepLinks.continueProject(next) }
        if let project = entry.snapshot.projects.first { return WidgetDeepLinks.albumPages(project: project) }
        return WidgetDeepLinks.createAlbum
    }
    private var action: String { entry.snapshot.albumsCount == 0 ? "Начать историю" : "Сохранить момент" }

    var body: some View {
        Group {
            switch family {
            case .accessoryInline:
                Label(next.map { "Сохранить момент · \($0.pageTitle)" } ?? "Какой момент хочется запомнить?", systemImage: "heart")
            case .systemMedium: medium
            default: small
            }
        }.widgetURL(destination)
    }

    private var small: some View {
        VStack(alignment: .leading, spacing: 5) {
            WidgetHeader(title: "Момент дня", icon: "quote.opening")
            Spacer(minLength: 0)
            Text(prompt).font(.system(size: 17, weight: .medium, design: .serif)).foregroundStyle(palette.textPrimary).lineLimit(3).fixedSize(horizontal: false, vertical: true).minimumScaleFactor(0.85).layoutPriority(1)
            Spacer(minLength: 0)
            Text("Одно фото. Несколько слов.").font(.system(size: 10)).foregroundStyle(palette.textSecondary).lineLimit(1)
            WidgetCallToAction(title: action)
        }
        .background(alignment: .topTrailing) {
            Text("“").font(.system(size: 76, weight: .regular, design: .serif)).foregroundStyle(palette.textSecondary.opacity(0.07))
                .padding(.top, 9).padding(.trailing, 2).accessibilityHidden(true)
        }
        .widgetCardBackground()
    }

    private var medium: some View {
        VStack(alignment: .leading, spacing: 10) {
            WidgetHeader(title: "Момент дня", icon: "quote.opening")
            HStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(prompt).font(.system(size: 18, weight: .medium, design: .serif)).foregroundStyle(palette.textPrimary).lineLimit(2).minimumScaleFactor(0.9)
                    Text("Одно фото. Несколько слов. Навсегда.")
                        .font(.system(size: 11)).foregroundStyle(palette.textSecondary).lineLimit(1)
                }
                Spacer(minLength: 0)
                WidgetKeepsakeStamp(symbol: "heart", category: category, size: 54).rotationEffect(.degrees(8))
            }
            Spacer(minLength: 0)
            HStack(spacing: 16) {
                Text(next?.projectTitle ?? (entry.snapshot.albumsCount == 0 ? "Ваше начало — здесь" : "Для ваших любимых историй"))
                    .font(.system(size: 10)).foregroundStyle(palette.textSecondary).lineLimit(1)
                Spacer(minLength: 0)
                WidgetCallToAction(title: action).frame(maxWidth: 138)
            }
        }.widgetCardBackground()
    }
}

struct QuickAccessWidget: Widget {
    let kind = "QuickAccessWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WidgetSnapshotProvider()) { entry in
            QuickAccessEntryView(entry: entry).widgetHomeScreenContainer()
        }
        .configurationDisplayName("Момент дня")
        .description("Новая подсказка каждый день: сохраните маленький момент в своём альбоме.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryInline])
        .contentMarginsDisabled()
        .containerBackgroundRemovable(true)
    }
}
