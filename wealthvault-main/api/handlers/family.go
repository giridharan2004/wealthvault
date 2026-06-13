package handlers

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/gin-gonic/gin"
)

func generateInviteCode() string {
	rand.Seed(time.Now().UnixNano())
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	code := make([]byte, 6)
	for i := range code {
		code[i] = chars[rand.Intn(len(chars))]
	}
	return fmt.Sprintf("FAMILY-%s", string(code))
}

func CreateFamily(c *gin.Context) {
	uid := c.GetString("uid")
	ctx := context.Background()

	var req struct {
		FamilyName  string `json:"familyName" binding:"required"`
		DisplayName string `json:"displayName" binding:"required"`
		PhotoURL    string `json:"photoURL"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	client, err := getFirestoreClient()
	if err != nil {
		c.JSON(500, gin.H{"error": "database connection failed"})
		return
	}

	// Check if user already belongs to a family
	userDoc, err := client.Collection("users").Doc(uid).Get(ctx)
	if err == nil && userDoc.Exists() {
		data := userDoc.Data()
		if fid, ok := data["familyId"].(string); ok && fid != "" {
			c.JSON(400, gin.H{"error": "you already belong to a family"})
			return
		}
	}

	inviteCode := generateInviteCode()
	familyRef := client.Collection("families").NewDoc()

	member := map[string]interface{}{
		"uid":         uid,
		"displayName": req.DisplayName,
		"photoURL":    req.PhotoURL,
		"role":        "admin",
		"joinedAt":    time.Now().Unix(),
	}

	_, err = familyRef.Set(ctx, map[string]interface{}{
		"id":         familyRef.ID,
		"name":       req.FamilyName,
		"inviteCode": inviteCode,
		"createdBy":  uid,
		"createdAt":  time.Now().Unix(),
		"members":    []map[string]interface{}{member},
	})
	if err != nil {
		log.Printf("Family create error: %v", err)
		c.JSON(500, gin.H{"error": "failed to create family"})
		return
	}

	_, err = client.Collection("users").Doc(uid).Set(ctx, map[string]interface{}{
		"familyId":    familyRef.ID,
		"displayName": req.DisplayName,
		"photoURL":    req.PhotoURL,
	}, firestore.MergeAll)
	if err != nil {
		log.Printf("User update error: %v", err)
	}

	c.JSON(201, gin.H{
		"familyId":   familyRef.ID,
		"inviteCode": inviteCode,
		"message":    "family created",
	})
}

func JoinFamily(c *gin.Context) {
	uid := c.GetString("uid")
	ctx := context.Background()

	var req struct {
		InviteCode  string `json:"inviteCode" binding:"required"`
		DisplayName string `json:"displayName" binding:"required"`
		PhotoURL    string `json:"photoURL"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	client, err := getFirestoreClient()
	if err != nil {
		c.JSON(500, gin.H{"error": "database connection failed"})
		return
	}

	// Check if user already in a family
	userDoc, err := client.Collection("users").Doc(uid).Get(ctx)
	if err == nil && userDoc.Exists() {
		data := userDoc.Data()
		if fid, ok := data["familyId"].(string); ok && fid != "" {
			c.JSON(400, gin.H{"error": "you already belong to a family"})
			return
		}
	}

	// Find family by invite code
	docs, err := client.Collection("families").
		Where("inviteCode", "==", req.InviteCode).
		Documents(ctx).GetAll()
	if err != nil || len(docs) == 0 {
		c.JSON(404, gin.H{"error": "invalid invite code"})
		return
	}

	familyDoc := docs[0]
	familyData := familyDoc.Data()

	members, _ := familyData["members"].([]interface{})
	if len(members) >= 6 {
		c.JSON(400, gin.H{"error": "family is full (max 6 members)"})
		return
	}

	newMember := map[string]interface{}{
		"uid":         uid,
		"displayName": req.DisplayName,
		"photoURL":    req.PhotoURL,
		"role":        "member",
		"joinedAt":    time.Now().Unix(),
	}
	members = append(members, newMember)

	_, err = familyDoc.Ref.Update(ctx, []firestore.Update{
		{Path: "members", Value: members},
	})
	if err != nil {
		log.Printf("Family join error: %v", err)
		c.JSON(500, gin.H{"error": "failed to join family"})
		return
	}

	_, err = client.Collection("users").Doc(uid).Set(ctx, map[string]interface{}{
		"familyId":    familyDoc.Ref.ID,
		"displayName": req.DisplayName,
		"photoURL":    req.PhotoURL,
	}, firestore.MergeAll)
	if err != nil {
		log.Printf("User update error: %v", err)
	}

	c.JSON(200, gin.H{
		"familyId": familyDoc.Ref.ID,
		"message":  "joined family successfully",
	})
}

func GetFamily(c *gin.Context) {
	uid := c.GetString("uid")
	ctx := context.Background()

	client, err := getFirestoreClient()
	if err != nil {
		c.JSON(500, gin.H{"error": "database connection failed"})
		return
	}

	userDoc, err := client.Collection("users").Doc(uid).Get(ctx)
	if err != nil {
		c.JSON(404, gin.H{"error": "user not found"})
		return
	}

	userData := userDoc.Data()
	familyId, ok := userData["familyId"].(string)
	if !ok || familyId == "" {
		c.JSON(404, gin.H{"error": "not in a family"})
		return
	}

	familyDoc, err := client.Collection("families").Doc(familyId).Get(ctx)
	if err != nil {
		c.JSON(404, gin.H{"error": "family not found"})
		return
	}

	c.JSON(200, familyDoc.Data())
}

func GetFamilyMemberAssets(c *gin.Context) {
	uid := c.GetString("uid")
	memberUID := c.Param("uid")
	ctx := context.Background()

	client, err := getFirestoreClient()
	if err != nil {
		c.JSON(500, gin.H{"error": "database connection failed"})
		return
	}

	// Verify both users are in the same family
	userDoc, err := client.Collection("users").Doc(uid).Get(ctx)
	if err != nil {
		c.JSON(404, gin.H{"error": "user not found"})
		return
	}
	userFamilyId, _ := userDoc.Data()["familyId"].(string)

	memberDoc, err := client.Collection("users").Doc(memberUID).Get(ctx)
	if err != nil {
		c.JSON(404, gin.H{"error": "member not found"})
		return
	}
	memberFamilyId, _ := memberDoc.Data()["familyId"].(string)

	if userFamilyId == "" || userFamilyId != memberFamilyId {
		c.JSON(403, gin.H{"error": "not in the same family"})
		return
	}

	docs, err := client.Collection("users").Doc(memberUID).
		Collection("assets").Documents(ctx).GetAll()
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to fetch assets"})
		return
	}

	assets := []map[string]interface{}{}
	for _, doc := range docs {
		assets = append(assets, doc.Data())
	}

	c.JSON(200, gin.H{"assets": assets})
}
