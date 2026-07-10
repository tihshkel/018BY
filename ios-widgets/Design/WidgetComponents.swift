import SwiftUI
import WidgetKit

enum WidgetColors {
    static let primary = Color(red: 241 / 255, green: 148 / 255, blue: 162 / 255)
    static let primaryLight = Color(red: 245 / 255, green: 168 / 255, blue: 179 / 255)
    static let primaryDeep = Color(red: 217 / 255, green: 127 / 255, blue: 141 / 255)
    static let primarySurface = Color(red: 253 / 255, green: 240 / 255, blue: 242 / 255)
    static let primarySurfaceStrong = Color(red: 250 / 255, green: 228 / 255, blue: 232 / 255)
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
                textPrimary: Color(red: 0.97, green: 0.95, blue: 0.96),
                textSecondary: Color(red: 0.78, green: 0.72, blue: 0.75),
                surface: Color.white.opacity(0.08),
                surfaceElevated: Color.white.opacity(0.12),
                border: Color.white.opacity(0.14),
                track: Color.white.opacity(0.16),
                glowStrong: WidgetColors.primary.opacity(0.34),
                glowSoft: WidgetColors.primaryLight.opacity(0.18)
            )
        }

        return WidgetPalette(
            textPrimary: Color(red: 61 / 255, green: 61 / 255, blue: 61 / 255),
            textSecondary: Color(red: 138 / 255, green: 138 / 255, blue: 138 / 255),
            surface: WidgetColors.primarySurface.opacity(0.72),
            surfaceElevated: Color.white.opacity(0.92),
            border: Color(red: 245 / 255, green: 220 / 255, blue: 226 / 255),
            track: Color(red: 236 / 255, green: 214 / 255, blue: 220 / 255),
            glowStrong: WidgetColors.primary.opacity(0.22),
            glowSoft: WidgetColors.primaryLight.opacity(0.28)
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

enum WidgetBackgroundStyle {
    @ViewBuilder
    static func canvas(colorScheme: ColorScheme) -> some View {
        ZStack {
            if colorScheme == .dark {
                LinearGradient(
                    colors: [
                        Color(red: 0.20, green: 0.13, blue: 0.16),
                        Color(red: 0.11, green: 0.09, blue: 0.11),
                        Color(red: 0.16, green: 0.10, blue: 0.13),
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            } else {
                LinearGradient(
                    colors: [
                        Color.white,
                        WidgetColors.primarySurface,
                        WidgetColors.primarySurfaceStrong,
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            }

            Circle()
                .fill(WidgetColors.primary.opacity(colorScheme == .dark ? 0.30 : 0.20))
                .frame(width: 132, height: 132)
                .offset(x: 78, y: -52)

            Circle()
                .fill(WidgetColors.primaryLight.opacity(colorScheme == .dark ? 0.16 : 0.26))
                .frame(width: 92, height: 92)
                .offset(x: -72, y: 58)

            Circle()
                .fill(Color.white.opacity(colorScheme == .dark ? 0.04 : 0.55))
                .frame(width: 54, height: 54)
                .offset(x: 48, y: 42)
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

    func widgetSectionCard(padding: CGFloat = 12) -> some View {
        modifier(WidgetSectionCardModifier(padding: padding))
    }
}

private struct WidgetSectionCardModifier: ViewModifier {
    @Environment(\.widgetPalette) private var palette
    let padding: CGFloat

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(palette.surfaceElevated)
            .overlay {
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(palette.border, lineWidth: 1)
            }
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

struct WidgetBrandMark: View {
    @Environment(\.widgetPalette) private var palette
    var compact: Bool = false

    var body: some View {
        HStack(spacing: 6) {
            ZStack {
                RoundedRectangle(cornerRadius: compact ? 7 : 8, style: .continuous)
                    .fill(WidgetColors.primary.opacity(0.18))
                    .frame(width: compact ? 22 : 24, height: compact ? 22 : 24)
                Image(systemName: "book.closed.fill")
                    .font(.system(size: compact ? 11 : 12, weight: .semibold))
                    .foregroundStyle(WidgetColors.primaryDeep)
            }
            Text("018BY")
                .font(.system(size: compact ? 11 : 12, weight: .bold, design: .rounded))
                .foregroundStyle(palette.textSecondary)
        }
    }
}

struct WidgetAccentPill: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.system(size: 10, weight: .semibold, design: .rounded))
            .foregroundStyle(WidgetColors.primaryDeep)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(WidgetColors.primary.opacity(0.16))
            .clipShape(Capsule())
    }
}

struct WidgetActionOrb: View {
    var size: CGFloat = 54
    var iconSize: CGFloat = 24

    var body: some View {
        ZStack {
            Circle()
                .fill(
                    LinearGradient(
                        colors: [WidgetColors.primaryLight, WidgetColors.primary],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .shadow(color: WidgetColors.primary.opacity(0.35), radius: 10, y: 4)
            Image(systemName: "plus")
                .font(.system(size: iconSize, weight: .bold))
                .foregroundStyle(Color.white)
        }
        .frame(width: size, height: size)
    }
}

struct WidgetProgressRing: View {
    @Environment(\.widgetPalette) private var palette
    let percent: Int
    var lineWidth: CGFloat = 6
    var size: CGFloat = 44

    var body: some View {
        ZStack {
            Circle()
                .stroke(palette.track, lineWidth: lineWidth)
            Circle()
                .trim(from: 0, to: CGFloat(min(max(percent, 0), 100)) / 100)
                .stroke(
                    LinearGradient(
                        colors: [WidgetColors.primaryLight, WidgetColors.primary],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
            Text("\(percent)%")
                .font(.system(size: size * 0.24, weight: .bold, design: .rounded))
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
        VStack(alignment: .leading, spacing: 8) {
            WidgetBrandMark()
            Text(title)
                .font(.system(size: 16, weight: .bold, design: .rounded))
                .foregroundStyle(palette.textPrimary)
            Text(subtitle)
                .font(.system(size: 12, weight: .medium))
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
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [
                            WidgetColors.primarySurface,
                            WidgetColors.primarySurfaceStrong,
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 42, height: 54)
                .overlay {
                    Image(systemName: "photo.on.rectangle.angled")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(WidgetColors.primaryDeep)
                }
                .overlay {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(palette.border, lineWidth: 1)
                }
            VStack(alignment: .leading, spacing: 2) {
                Text(project.title)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(palette.textPrimary)
                    .lineLimit(1)
                if let remaining = project.unfinishedPages, remaining > 0 {
                    Text("Осталось \(remaining) стр. · \(project.percent)%")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(palette.textSecondary)
                        .lineLimit(1)
                } else {
                    Text("\(project.categoryLabel) · \(project.percent)%")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(palette.textSecondary)
                        .lineLimit(1)
                }
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
