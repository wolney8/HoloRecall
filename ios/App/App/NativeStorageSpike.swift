#if DEBUG
import Foundation
import SQLite3

/// Isolated command-line activated feasibility probe. It never opens HoloRecall's production store.
enum NativeStorageSpike {
    private static let argument = "-HoloRecallNativeStorageSpike"

    static func runIfRequested() {
        guard let marker = ProcessInfo.processInfo.arguments.firstIndex(of: argument),
              ProcessInfo.processInfo.arguments.indices.contains(marker + 1) else { return }
        let mode = ProcessInfo.processInfo.arguments[marker + 1]
        DispatchQueue.global(qos: .utility).async {
            do {
                let result = try run(mode: mode)
                NSLog("HR_NATIVE_STORAGE_SPIKE %@ %@", mode, result)
            } catch {
                NSLog("HR_NATIVE_STORAGE_SPIKE %@ FAILED %@", mode, String(describing: error))
            }
        }
    }

    private static func run(mode: String) throws -> String {
        let directory = try FileManager.default.url(
            for: .applicationSupportDirectory,
            in: .userDomainMask,
            appropriateFor: nil,
            create: true
        ).appendingPathComponent("HoloRecallNativeSpike", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let url = directory.appendingPathComponent("fixture.sqlite")
        if mode == "seed" { try? FileManager.default.removeItem(at: url) }

        var database: OpaquePointer?
        guard sqlite3_open_v2(url.path, &database, SQLITE_OPEN_CREATE | SQLITE_OPEN_READWRITE | SQLITE_OPEN_FULLMUTEX, nil) == SQLITE_OK,
              let database else { throw SpikeError.open }
        defer { sqlite3_close(database) }
        try execute(database, "PRAGMA foreign_keys=ON")

        if mode == "seed" {
            try execute(database, "CREATE TABLE metadata(key TEXT PRIMARY KEY, value TEXT NOT NULL)")
            try execute(database, "CREATE TABLE cards(id TEXT PRIMARY KEY, answer TEXT NOT NULL, revision INTEGER NOT NULL)")
            try transaction(database) {
                try execute(database, "INSERT INTO metadata VALUES('fixture','isolated-native-storage')")
                try execute(database, "INSERT INTO cards VALUES('card-stable','ciao',1)")
            }
            var rolledBack = false
            do {
                try transaction(database) {
                    try execute(database, "INSERT INTO cards VALUES('card-rollback','must-not-survive',1)")
                    try execute(database, "INSERT INTO cards VALUES('card-stable','duplicate',2)")
                }
            } catch {
                rolledBack = true
            }
            try execute(database, "PRAGMA user_version=1")
            let count = try integer(database, "SELECT COUNT(*) FROM cards")
            let rollbackCount = try integer(database, "SELECT COUNT(*) FROM cards WHERE id='card-rollback'")
            return "path=ApplicationSupport schema=1 cards=\(count) rollbackTriggered=\(rolledBack) rollbackRows=\(rollbackCount)"
        }

        let before = try integer(database, "PRAGMA user_version")
        guard before >= 1 else { throw SpikeError.missingSeed }
        if before < 2 {
            try transaction(database) {
                try execute(database, "ALTER TABLE cards ADD COLUMN note TEXT NOT NULL DEFAULT ''")
                try execute(database, "UPDATE cards SET answer='ciao aggiornato', revision=2, note='migration-ok' WHERE id='card-stable'")
                try execute(database, "PRAGMA user_version=2")
            }
        }
        let after = try integer(database, "PRAGMA user_version")
        let count = try integer(database, "SELECT COUNT(*) FROM cards")
        let revision = try integer(database, "SELECT revision FROM cards WHERE id='card-stable'")
        let rollbackCount = try integer(database, "SELECT COUNT(*) FROM cards WHERE id='card-rollback'")
        return "path=ApplicationSupport schemaBefore=\(before) schemaAfter=\(after) cards=\(count) revision=\(revision) rollbackRows=\(rollbackCount)"
    }

    private static func transaction(_ database: OpaquePointer, operation: () throws -> Void) throws {
        try execute(database, "BEGIN IMMEDIATE")
        do {
            try operation()
            try execute(database, "COMMIT")
        } catch {
            try? execute(database, "ROLLBACK")
            throw error
        }
    }

    private static func execute(_ database: OpaquePointer, _ sql: String) throws {
        var message: UnsafeMutablePointer<CChar>?
        let result = sqlite3_exec(database, sql, nil, nil, &message)
        guard result == SQLITE_OK else {
            let detail = message.map { String(cString: $0) } ?? "SQLite error \(result)"
            sqlite3_free(message)
            throw SpikeError.sql(detail)
        }
    }

    private static func integer(_ database: OpaquePointer, _ sql: String) throws -> Int32 {
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(database, sql, -1, &statement, nil) == SQLITE_OK, let statement else {
            throw SpikeError.sql(String(cString: sqlite3_errmsg(database)))
        }
        defer { sqlite3_finalize(statement) }
        guard sqlite3_step(statement) == SQLITE_ROW else {
            throw SpikeError.sql(String(cString: sqlite3_errmsg(database)))
        }
        return sqlite3_column_int(statement, 0)
    }

    private enum SpikeError: Error {
        case open
        case missingSeed
        case sql(String)
    }
}
#endif
