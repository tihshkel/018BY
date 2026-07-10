import SwiftUI
import WidgetKit

struct QuickAccessEntryView: View {
    @Environment(\.widgetFamily) private var family
    @Environment(\.widgetPalette) private var palette
    let entry: WidgetEntry

    var body: some View {
        Group {
            switch family {
            case .systemSmall:
                smallView
            case .systemMedium:
                mediumView
            case .accessoryInline:
                Text("018BY · Мои истории")
                    .font(.system(size: 12, weight: .semibold))
            default:
                smallView
            }
        }
        .widgetURL(WidgetDeepLinks.createAlbum)
    }

    private var smallView: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                WidgetBrandMark(compact: true)
                Spacer(minLength: 0)
                WidgetActionOrb(size: 34, iconSize: 16)
            }
            Spacer(minLength: 0)
            WidgetAccentPill(text: "Мои истории")
            Text("Открыть\nистории")
                .font(.system(size: 19, weight: .bold, design: .rounded))
                .foregroundStyle(palette.textPrimary)
                .lineSpacing(1)
            Text("Выберите категорию и шаблон альбома")
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(palette.textSecondary)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .widgetCardBackground()
    }

    private var mediumView: some View {
        HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 10) {
                WidgetBrandMark()
                WidgetAccentPill(text: "Мои истории")
                Text("Новый альбом")
                    .font(.system(size: 22, weight: .bold, design: .rounded))
                    .foregroundStyle(palette.textPrimary)
                Text("Категории с правильными обложками для каждой темы")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(palette.textSecondary)
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
            WidgetActionOrb(size: 58, iconSize: 26)
        }
        .widgetCardBackground()
    }
}

struct QuickAccessWidget: Widget {
    let kind = "QuickAccessWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WidgetSnapshotProvider()) { entry in
            QuickAccessEntryView(entry: entry)
                .widgetHomeScreenContainer()
        }
        .configurationDisplayName("Быстрый доступ")
        .description("Откройте «Мои истории» и выберите шаблон альбома.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryInline])
        .containerBackgroundRemovable(true)
    }
}
