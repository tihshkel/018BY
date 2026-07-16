import SwiftUI
import WidgetKit

enum WidgetColors {
    static let primary = Color(red: 241 / 255, green: 148 / 255, blue: 162 / 255)
    static let primaryLight = Color(red: 245 / 255, green: 168 / 255, blue: 179 / 255)
    static let primaryDeep = Color(red: 196 / 255, green: 106 / 255, blue: 122 / 255)
    static let primarySurface = Color(red: 252 / 255, green: 246 / 255, blue: 247 / 255)
    static let primarySurfaceStrong = Color(red: 248 / 255, green: 236 / 255, blue: 239 / 255)
}

struct WidgetPalette {
    let textPrimary: Color
    let textSecondary: Color
    let surface: Color
    let surfaceElevated: Color
    let border: Color
    let track: Color
    let glowStrong: Color
    let glowSoft: Color

    static func make(colorScheme: ColorScheme) -> WidgetPalette {
        if colorScheme == .dark {
            return WidgetPalette(
                textPrimary: Color(red: 0.96, green: 0.96, blue: 0.97),
                textSecondary: Color(red: 0.72, green: 0.72, blue: 0.76),
                surface: Color.white.opacity(0.06),
                surfaceElevated: Color.white.opacity(0.10),
                border: Color.white.opacity(0.10),
                track: Color.white.opacity(0.14),
                glowStrong: WidgetColors.primary.opacity(0.20),
                glowSoft: WidgetColors.primaryLight.opacity(0.10)
            )
        }

        return WidgetPalette(
            textPrimary: Color(red: 40 / 255, green: 40 / 255, blue: 42 / 255),
            textSecondary: Color(red: 120 / 255, green: 118 / 255, blue: 122 / 255),
            surface: Color(red: 250 / 255, green: 249 / 255, blue: 250 / 255),
            surfaceElevated: Color.white,
            border: Color(red: 232 / 255, green: 228 / 255, blue: 230 / 255),
            track: Color(red: 230 / 255, green: 226 / 255, blue: 228 / 255),
            glowStrong: WidgetColors.primary.opacity(0.12),
            glowSoft: WidgetColors.primaryLight.opacity(0.10)
        )
    }
}

private struct WidgetPaletteKey: EnvironmentKey {
    static let defaultValue = WidgetPalette.make(colorScheme: .light)
}

extension EnvironmentValues {
    var widgetPalette: WidgetPalette {
        get { self[WidgetPaletteKey.self] }
        set { self[WidgetPaletteKey.self] = newValue }
    }
}

/// Clean flat canvas — no decorative orbs (info-first widgets).
enum WidgetBackgroundStyle {
    @ViewBuilder
    static func canvas(colorScheme: ColorScheme) -> some View {
        if colorScheme == .dark {
            Color(red: 0.11, green: 0.11, blue: 0.12)
        } else {
            Color.white
        }
    }
}

private struct WidgetPaletteModifier: ViewModifier {
    @Environment(\.colorScheme) private var colorScheme

    func body(content: Content) -> some View {
        content
            .environment(\.widgetPalette, WidgetPalette.make(colorScheme: colorScheme))
    }
}

/// iOS 17+ requires `containerBackground(for: .widget)`.
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
                        WidgetBackgroundStyle.canvas(colorScheme: colorScheme)
                    }
            } else {
                content
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(WidgetBackgroundStyle.canvas(colorScheme: colorScheme))
            }
        } else {
            content
        }
    }
}

extension View {
    func widgetHomeScreenContainer() -> some View {
        modifier(WidgetHomeScreenContainerModifier())
            .modifier(WidgetPaletteModifier())
    }

    func widgetCardBackground() -> some View {
        padding(14)
    }

    func widgetSectionCard(padding: CGFloat = 10) -> some View {
        modifier(WidgetSectionCardModifier(padding: padding))
    }
}

private struct WidgetSectionCardModifier: ViewModifier {
    @Environment(\.widgetPalette) private var palette
    let padding: CGFloat

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(palette.surface)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

struct WidgetBrandMark: View {
    @Environment(\.widgetPalette) private var palette
    var compact: Bool = false

    var body: some View {
        Text("018BY")
            .font(.system(size: compact ? 10 : 11, weight: .semibold, design: .rounded))
            .foregroundStyle(palette.textSecondary)
            .tracking(0.6)
    }
}

struct WidgetAccentPill: View {
    @Environment(\.widgetPalette) private var palette
    let text: String

    var body: some View {
        Text(text)
            .font(.system(size: 10, weight: .semibold, design: .rounded))
            .foregroundStyle(palette.textSecondary)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(palette.surface)
            .clipShape(Capsule())
    }
}

/// Kept for tests / legacy; prefer info metrics over CTA orbs.
struct WidgetActionOrb: View {
    var size: CGFloat = 54
    var iconSize: CGFloat = 24

    var body: some View {
        ZStack {
            Circle()
                .fill(WidgetColors.primary.opacity(0.16))
            Image(systemName: "plus")
                .font(.system(size: iconSize, weight: .semibold))
                .foregroundStyle(WidgetColors.primaryDeep)
        }
        .frame(width: size, height: size)
    }
}

struct WidgetMetricLabel: View {
    @Environment(\.widgetPalette) private var palette
    let text: String

    var body: some View {
        Text(text.uppercased())
            .font(.system(size: 10, weight: .semibold, design: .rounded))
            .foregroundStyle(palette.textSecondary)
            .tracking(0.5)
    }
}

struct WidgetHeroNumber: View {
    let text: String
    var size: CGFloat = 34

    var body: some View {
        Text(text)
            .font(.system(size: size, weight: .bold, design: .rounded))
            .foregroundStyle(WidgetColors.primaryDeep)
            .minimumScaleFactor(0.6)
            .lineLimit(1)
    }
}

struct WidgetProgressRing: View {
    @Environment(\.widgetPalette) private var palette
    let percent: Int
    var lineWidth: CGFloat = 5
    var size: CGFloat = 44

    var body: some View {
        ZStack {
            Circle()
                .stroke(palette.track, lineWidth: lineWidth)
            Circle()
                .trim(from: 0, to: CGFloat(min(max(percent, 0), 100)) / 100)
                .stroke(
                    WidgetColors.primary,
                    style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
            Text("\(percent)%")
                .font(.system(size: size * 0.22, weight: .bold, design: .rounded))
                .foregroundStyle(palette.textPrimary)
        }
        .frame(width: size, height: size)
    }
}

struct WidgetEmptyState: View {
    @Environment(\.widgetPalette) private var palette
    let title: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            WidgetBrandMark()
            Text(title)
                .font(.system(size: 17, weight: .bold, design: .rounded))
                .foregroundStyle(palette.textPrimary)
            Text(subtitle)
                .font(.system(size: 12, weight: .regular))
                .foregroundStyle(palette.textSecondary)
                .lineLimit(3)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .widgetCardBackground()
    }
}

struct WidgetProjectRow: View {
    @Environment(\.widgetPalette) private var palette
    let project: WidgetProjectItem

    var body: some View {
        HStack(spacing: 10) {
            VStack(alignment: .leading, spacing: 2) {
                Text(project.title)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(palette.textPrimary)
                    .lineLimit(1)
                if let remaining = project.unfinishedPages, remaining > 0 {
                    Text("\(remaining) стр. · \(project.percent)%")
                        .font(.system(size: 11, weight: .regular))
                        .foregroundStyle(palette.textSecondary)
                        .lineLimit(1)
                } else {
                    Text("\(project.categoryLabel) · \(project.percent)%")
                        .font(.system(size: 11, weight: .regular))
                        .foregroundStyle(palette.textSecondary)
                        .lineLimit(1)
                }
            }
            Spacer(minLength: 4)
            WidgetProgressRing(percent: project.percent, lineWidth: 3.5, size: 34)
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
