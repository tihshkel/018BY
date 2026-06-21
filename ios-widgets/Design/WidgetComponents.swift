import SwiftUI
import WidgetKit

enum WidgetColors {
    static let primary = Color(red: 241 / 255, green: 148 / 255, blue: 162 / 255)
    static let primarySurface = Color(red: 253 / 255, green: 240 / 255, blue: 242 / 255)
    static let textPrimary = Color(red: 61 / 255, green: 61 / 255, blue: 61 / 255)
    static let textSecondary = Color(red: 138 / 255, green: 138 / 255, blue: 138 / 255)
    static let border = Color(red: 229 / 255, green: 229 / 255, blue: 229 / 255)
    static let track = Color(red: 229 / 255, green: 229 / 255, blue: 229 / 255)
}

enum WidgetBackgroundStyle {
    static func cardGradient(colorScheme: ColorScheme) -> LinearGradient {
        LinearGradient(
            colors: colorScheme == .dark
                ? [Color(white: 0.14), Color(white: 0.18)]
                : [Color.white, WidgetColors.primarySurface],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
}

/// iOS 17+ requires `containerBackground(for: .widget)` — without it Home Screen widgets render as blank white boxes.
private struct WidgetHomeScreenContainerModifier: ViewModifier {
    @Environment(\.widgetFamily) private var family
    @Environment(\.colorScheme) private var colorScheme

    private var isHomeScreenFamily: Bool {
        switch family {
        case .systemSmall, .systemMedium, .systemLarge, .systemExtraLarge:
            return true
        default:
            return false
        }
    }

    func body(content: Content) -> some View {
        if isHomeScreenFamily {
            if #available(iOSApplicationExtension 17.0, *) {
                content
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .containerBackground(for: .widget) {
                        WidgetBackgroundStyle.cardGradient(colorScheme: colorScheme)
                    }
            } else {
                content
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(WidgetBackgroundStyle.cardGradient(colorScheme: colorScheme))
            }
        } else {
            content
        }
    }
}

extension View {
    func widgetHomeScreenContainer() -> some View {
        modifier(WidgetHomeScreenContainerModifier())
    }

    func widgetCardBackground() -> some View {
        padding(12)
    }
}

struct WidgetBrandMark: View {
    var compact: Bool = false

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: "book.closed.fill")
                .font(.system(size: compact ? 12 : 14, weight: .semibold))
                .foregroundStyle(WidgetColors.primary)
            Text("018BY")
                .font(.system(size: compact ? 11 : 13, weight: .bold, design: .rounded))
                .foregroundStyle(WidgetColors.textPrimary)
        }
    }
}

struct WidgetProgressRing: View {
    let percent: Int
    var lineWidth: CGFloat = 6
    var size: CGFloat = 44

    var body: some View {
        ZStack {
            Circle()
                .stroke(WidgetColors.track, lineWidth: lineWidth)
            Circle()
                .trim(from: 0, to: CGFloat(min(max(percent, 0), 100)) / 100)
                .stroke(
                    WidgetColors.primary,
                    style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
            Text("\(percent)%")
                .font(.system(size: size * 0.24, weight: .semibold, design: .rounded))
                .foregroundStyle(WidgetColors.textPrimary)
        }
        .frame(width: size, height: size)
    }
}

struct WidgetEmptyState: View {
    let title: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            WidgetBrandMark()
            Text(title)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(WidgetColors.textPrimary)
            Text(subtitle)
                .font(.system(size: 12, weight: .regular))
                .foregroundStyle(WidgetColors.textSecondary)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .widgetCardBackground()
    }
}

struct WidgetProjectRow: View {
    let project: WidgetProjectItem

    var body: some View {
        HStack(spacing: 10) {
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(WidgetColors.primarySurface)
                .frame(width: 42, height: 54)
                .overlay {
                    Image(systemName: "photo.on.rectangle.angled")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(WidgetColors.primary)
                }
            VStack(alignment: .leading, spacing: 2) {
                Text(project.title)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(WidgetColors.textPrimary)
                    .lineLimit(1)
                Text(project.categoryLabel)
                    .font(.system(size: 11, weight: .regular))
                    .foregroundStyle(WidgetColors.textSecondary)
                    .lineLimit(1)
            }
            Spacer(minLength: 4)
            WidgetProgressRing(percent: project.percent, lineWidth: 4, size: 38)
        }
    }
}

struct WidgetSnapshotProvider: TimelineProvider {
    func placeholder(in context: Context) -> WidgetEntry {
        WidgetDataStore.makeEntry()
    }

    func getSnapshot(in context: Context, completion: @escaping (WidgetEntry) -> Void) {
        completion(WidgetDataStore.makeEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<WidgetEntry>) -> Void) {
        completion(WidgetDataStore.makeTimeline())
    }
}
