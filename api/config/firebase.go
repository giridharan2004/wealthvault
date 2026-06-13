package config

import (
    "context"
    "log"
    "os"

    firebase "firebase.google.com/go/v4"
    "google.golang.org/api/option"
)

func InitFirebase() *firebase.App {
    ctx := context.Background()

    // Look for service account key in secrets folder
    credPath := os.Getenv("FIREBASE_CREDENTIALS")
    if credPath == "" {
        credPath = "../secrets/firebase-key.json"
    }

    opt := option.WithCredentialsFile(credPath)
    app, err := firebase.NewApp(ctx, nil, opt)
    if err != nil {
        log.Fatalf("Failed to initialize Firebase: %v", err)
    }

    log.Println("Firebase initialized successfully")
    return app
}
