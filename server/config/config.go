package config

import (
	"log/slog"
	"net/url"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

/*
In dev, these values will be overwritten with dev.env values
The below defaults are meant to work out of the box with
the provided docker-compose.yml
*/
var (
	AppEnvironment                string = "development"
	PostgresDBName                string = "hound_db"
	PostgresHost                  string = "hound-postgres"
	PostgresPort                  string = "5432"
	PostgresUser                  string = "hound"
	PostgresPassword              string = "password"
	HoundSecret                   string = ""
	DebugLogging                  bool   = false
	MaxConcurrentDownloads        int    = 3
	MaxConcurrentIngests          int    = 3
	ExternalLibraryWorkersEnabled bool   = true
	ExternalLibraryMoviesPath     string = "/app/External Library/Movies"
	ExternalLibraryTVPath         string = "/app/External Library/TV Shows"
	ExternalLibraryScanInterval   int    = 360
	MaxExternalLibraryWorkers     int    = 2
	TMDBAPIKey                    string = ""
	MDBListAPIKey                 string = ""
	HoundPlusHost                 string = ""
	HoundPlusAPIKey               string = ""
)

func InitializeConfig() {
	AppEnvironment = getEnvString("APP_ENV", AppEnvironment)
	// load env file to os for dev
	if AppEnvironment != "production" {
		_ = godotenv.Load("dev.env")
	}
	PostgresHost = getEnvString("POSTGRES_HOST", PostgresHost)
	PostgresPort = getEnvString("POSTGRES_PORT", PostgresPort)
	PostgresUser = getEnvString("POSTGRES_USER", PostgresUser)
	PostgresPassword = getEnvString("POSTGRES_PASSWORD", PostgresPassword)
	PostgresDBName = getEnvString("POSTGRES_DB", PostgresDBName)
	HoundSecret = getEnvString("HOUND_SECRET", HoundSecret)
	if HoundSecret == "" {
		panic("Please set HOUND_SECRET in docker-compose environment")
	}
	DebugLogging = getEnvBool("DEBUG_LOGGING", DebugLogging)
	MaxConcurrentDownloads = getEnvInt("MAX_DOWNLOAD_WORKERS", MaxConcurrentDownloads)
	MaxConcurrentIngests = getEnvInt("MAX_INGEST_WORKERS", MaxConcurrentIngests)
	MaxExternalLibraryWorkers = getEnvInt("MAX_EXTERNAL_LIBRARY_WORKERS", MaxExternalLibraryWorkers)
	ExternalLibraryWorkersEnabled = getEnvBool("ENABLE_EXTERNAL_LIBRARY", ExternalLibraryWorkersEnabled)
	ExternalLibraryMoviesPath = getEnvString("EXTERNAL_LIBRARY_MOVIES_PATH", ExternalLibraryMoviesPath)
	ExternalLibraryTVPath = getEnvString("EXTERNAL_LIBRARY_SHOWS_PATH", ExternalLibraryTVPath)
	ExternalLibraryScanInterval = getEnvInt("EXTERNAL_LIBRARY_SCAN_INTERVAL_MINUTES", ExternalLibraryScanInterval)
	TMDBAPIKey = getEnvString("TMDB_API_KEY", TMDBAPIKey)
	MDBListAPIKey = getEnvString("MDBLIST_API_KEY", MDBListAPIKey)
	HoundPlusHost = getEnvString("HOUND_PLUS_SERVER_HOST", HoundPlusHost)
	HoundPlusAPIKey = getEnvString("HOUND_PLUS_API_KEY", HoundPlusAPIKey)
	if HoundPlusHost != "" {
		u, err := url.ParseRequestURI(HoundPlusHost)
		if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
			panic("Invalid HOUND_PLUS_SERVER_HOST, must be a valid http(s) url, e.g. https://example.com")
		}
	}

	slog.Info("Config Initialized",
		"AppEnvironment", AppEnvironment,
		"PostgresHost", PostgresHost,
		"PostgresPort", PostgresPort,
		"PostgresUser", PostgresUser,
		"PostgresDBName", PostgresDBName,
		"DebugLogging", DebugLogging,
		"MaxConcurrentDownloads", MaxConcurrentDownloads,
		"MaxConcurrentIngests", MaxConcurrentIngests,
		"MaxExternalLibraryWorkers", MaxExternalLibraryWorkers,
		"ExternalLibraryEnabled", ExternalLibraryWorkersEnabled,
		"ExternalLibraryMovies", ExternalLibraryMoviesPath,
		"ExternalLibraryTV", ExternalLibraryTVPath,
		"ExternalScanIntervalMinutes", ExternalLibraryScanInterval,
	)
}

func getEnvInt(key string, defaultValue int) int {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	val, err := strconv.Atoi(value)
	if err != nil {
		return defaultValue
	}
	return val
}

func getEnvString(key string, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

func getEnvBool(key string, defaultValue bool) bool {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	val, err := strconv.ParseBool(value)
	if err != nil {
		return defaultValue
	}
	return val
}
