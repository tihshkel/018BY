import Foundation
import WidgetKit

struct WidgetProjectItem: Codable, Hashable {
    let id: String
    let title: String
    let category: String
    let categoryLabel: String
    let percent: Int
    let celebration: String?
    let coverType: String?
    let pagesCount: Int
    let photosCount: Int
}

struct WidgetContinueItem: Codable, Hashable {
    let projectId: String
    let projectTitle: String
    let pageTitle: String
    let percent: Int
    let celebration: String?
    let coverType: String?
}

struct WidgetReminderItem: Codable, Hashable {
    let title: String
    let dateISO: String
    let daysLeft: Int
}

struct WidgetPregnancyItem: Codable, Hashable {
    let week: Int
    let daysLeft: Int
    let pdrISO: String
    let projectTitle: String
    let projectId: String
}

struct WidgetSnapshot: Codable {
    let updatedAt: String
    let userName: String?
    let projects: [WidgetProjectItem]
    let continueProject: WidgetContinueItem?
    let nextReminder: WidgetReminderItem?
    let reminders: [WidgetReminderItem]
    let pregnancy: WidgetPregnancyItem?
}

struct WidgetEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot
}

enum WidgetDataStore {
    static let suiteName = "group.com.tihshkel.x018BY.expowidgets"
    static let dataKey = "WidgetSnapshot"

    static func loadSnapshot() -> WidgetSnapshot {
        guard
            let suite = UserDefaults(suiteName: suiteName),
            let json = suite.string(forKey: dataKey),
            let data = json.data(using: .utf8),
            let snapshot = try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
        else {
            return emptySnapshot()
        }
        return snapshot
    }

    static func emptySnapshot() -> WidgetSnapshot {
        WidgetSnapshot(
            updatedAt: ISO8601DateFormatter().string(from: Date()),
            userName: nil,
            projects: [],
            continueProject: nil,
            nextReminder: nil,
            reminders: [],
            pregnancy: nil
        )
    }

    static func makeEntry() -> WidgetEntry {
        WidgetEntry(date: Date(), snapshot: loadSnapshot())
    }

    static func makeTimeline() -> Timeline<WidgetEntry> {
        let entry = makeEntry()
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date()
        return Timeline(entries: [entry], policy: .after(nextUpdate))
    }
}

enum WidgetDeepLinks {
    static let createAlbum = URL(string: "app018by://select-celebration")!
    static let reminders = URL(string: "app018by://reminders-list")!
    static let home = URL(string: "app018by://")!

    static func albumPages(project: WidgetProjectItem) -> URL {
        var components = URLComponents(string: "app018by://album-pages")!
        var query: [URLQueryItem] = [URLQueryItem(name: "id", value: project.id)]
        if let celebration = project.celebration {
            query.append(URLQueryItem(name: "celebration", value: celebration))
        }
        if let coverType = project.coverType {
            query.append(URLQueryItem(name: "coverType", value: coverType))
        }
        components.queryItems = query
        return components.url ?? home
    }

    static func continueProject(_ item: WidgetContinueItem) -> URL {
        var components = URLComponents(string: "app018by://album-pages")!
        var query: [URLQueryItem] = [URLQueryItem(name: "id", value: item.projectId)]
        if let celebration = item.celebration {
            query.append(URLQueryItem(name: "celebration", value: celebration))
        }
        if let coverType = item.coverType {
            query.append(URLQueryItem(name: "coverType", value: coverType))
        }
        components.queryItems = query
        return components.url ?? home
    }

    static func pregnancyProject(_ item: WidgetPregnancyItem) -> URL {
        var components = URLComponents(string: "app018by://album-pages")!
        components.queryItems = [URLQueryItem(name: "id", value: item.projectId)]
        return components.url ?? home
    }
}

enum WidgetFormatters {
    static func daysLabel(_ days: Int) -> String {
        if days == 0 { return "Сегодня" }
        if days == 1 { return "Завтра" }
        return "Через \(days) дн."
    }

    static func shortDate(_ iso: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var date = formatter.date(from: iso)
        if date == nil {
            formatter.formatOptions = [.withInternetDateTime]
            date = formatter.date(from: iso)
        }
        guard let parsed = date else { return iso }
        let display = DateFormatter()
        display.locale = Locale(identifier: "ru_RU")
        display.dateStyle = .medium
        return display.string(from: parsed)
    }
}
