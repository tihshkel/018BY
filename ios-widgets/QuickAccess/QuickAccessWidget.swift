import SwiftUI
import WidgetKit

struct QuickAccessEntryView: View {
    @Environment(\.widgetFamily) private var family
    let entry: WidgetEntry

    var body: some View {
        Group {
            switch family {
            case .systemSmall:
                smallView
            case .systemMedium:
                mediumView
            case .accessoryInline:
                Text("018BY · Создать альбом")
                    .font(.system(size: 12, weight: .semibold))
            default:
                smallView
            }
        }
        .widgetURL(WidgetDeepLinks.createAlbum)
    }

    private var smallView: some View {
        VStack(alignment: .leading, spacing: 10) {
            WidgetBrandMark()
            Spacer(minLength: 0)
            Text("Создать\nальбом")
                .font(.system(size: 18, weight: .bold, design: .rounded))
                .foregroundStyle(WidgetColors.textPrimary)
            Text("Сохраняйте важные моменты")
                .font(.system(size: 11))
                .foregroundStyle(WidgetColors.textSecondary)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .widgetCardBackground()
    }

    private var mediumView: some View {
        HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 8) {
                WidgetBrandMark()
                Text("Новый альбом")
                    .font(.system(size: 20, weight: .bold, design: .rounded))
                    .foregroundStyle(WidgetColors.textPrimary)
                Text("Беременность, детство, семья и другие истории")
                    .font(.system(size: 12))
                    .foregroundStyle(WidgetColors.textSecondary)
                    .lineLimit(2)
            }
            Spacer(minLength: 0)
            Image(systemName: "plus.circle.fill")
                .font(.system(size: 42))
                .foregroundStyle(WidgetColors.primary)
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
        .description("Создайте новый альбом в один тап.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryInline])
    }
}
