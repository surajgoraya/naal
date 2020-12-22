package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/go-github/github"
	"github.com/joho/godotenv"
	"github.com/monaco-io/request"
	"golang.org/x/oauth2"
)

type Link struct {
	Links []struct {
		LinkID    string `json:"linkID"`
		LinkTitle string `json:"linkTitle"`
		LinkTo    string `json:"linkTo"`
	} `json:"links"`
}

func main() {

	err := godotenv.Load(".env")

	if err != nil {
		log.Fatal("Error loading .env file")
	}

	app := fiber.New()

	app.Static("/bossman", "./naal-admin/build")
	app.Static("/bossman/*", "./naal-admin/build")
	app.Static("/auth/imposter", "./internal_static")

	app.Get("/auth/authenticate", func(c *fiber.Ctx) error {
		clientID := os.Getenv("GITHUB_CLIENTID")
		baseURL := "https://github.com/login/oauth/authorize?scope=user repo admin:read:org&client_id="
		generate := fmt.Sprintf("%s%s", baseURL, clientID)
		log.Println("Sending Request to get OAUTH Token: " + generate)
		return c.Redirect(generate)
	})

	app.Get("/auth/logout", func(c *fiber.Ctx) error {

		cookie := new(fiber.Cookie)
		cookie.Name = "SESSION_ID"
		cookie.Expires = time.Now().Add(-(time.Hour * 2))
		cookie.HTTPOnly = true
		cookie.SameSite = "lax"
		c.Cookie(cookie)

		if os.Getenv("MODE") == "debug" {
			return c.Redirect("http://localhost:3000/bossman")
		} else {
			return c.Redirect("/bossman")
		}
	})

	app.Get("/auth/authenticated", func(c *fiber.Ctx) error {
		code := c.Query("code")

		log.Println("**** Successfully authenticated with GAPI: " + code)

		client := request.Client{
			URL:    "https://github.com/login/oauth/access_token",
			Method: "POST",
			Params: map[string]string{"client_id": os.Getenv("GITHUB_CLIENTID"), "client_secret": os.Getenv("GITHUB_SECRET"), "code": code},
			// Body:   []byte(`{"hello": "world"}`),
		}
		resp, err := client.Do()

		if err != nil {
			log.Println("ERROR: Github API rejected")
			return fiber.NewError(fiber.StatusServiceUnavailable, "GitHub API Error.")
		} else {
			log.Println("200 - CALLBACKED")
			respToken := strings.Split(string(resp.Data), "=")
			authToken := strings.Split(respToken[1], "&")[0]

			if authToken == "bad_verification_code" {
				println("ERROR: GitHub returned bad AuthCode")
				return fiber.NewError(fiber.StatusUnauthorized, "Stale Authorization Code.")
			}

			log.Println("200 - NEW OUATH TOKEN RECIEVED & PROCESSED")

			//verify that user has access to access_control
			if checkAccessControl(authToken) == true {
				cookie := new(fiber.Cookie)
				cookie.Name = "SESSION_ID"
				cookie.Value = authToken
				cookie.Expires = time.Now().Add(96 * time.Hour)
				c.Cookie(cookie)

				if os.Getenv("MODE") == "debug" {
					return c.Redirect("http://localhost:3000/bossman/")
				} else {
					return c.Redirect("/bossman")
				}
			} else {
				return c.Redirect("/auth/imposter")
			}

		}

	})

	app.Get("/*", func(c *fiber.Ctx) error {
		// return c.Redirect(checkRedir(c.Path()))
		if c.Path() != "/favicon.ico" {
			result := checkRedir(c.Path())
			if result == "/notFound" {
				return c.SendStatus(404)
			} else if result == "/serverError" {
				return c.SendStatus(500)
			} else {
				return c.Redirect(result)
			}
		} else {
			return c.SendStatus(404)
		}
	})
	port := os.Getenv("PORT")

	if port == "" {
		port = "3000"
	}

	app.Listen(":" + port)
}

func checkAccessControl(authToken string) bool {

	ctx := context.Background()
	ts := oauth2.StaticTokenSource(
		&oauth2.Token{AccessToken: authToken},
	)
	tc := oauth2.NewClient(ctx, ts)

	client := github.NewClient(tc)

	// list all repositories for the authenticated user
	repos, _, err := client.Repositories.List(ctx, "", nil)

	if err != nil {
		println("ERROR: Cannot get repository information, likely a bad authocde")
		return false
		// panic("Error getting repository Inforamtion")
	}

	for _, v := range repos {
		if *v.URL == os.Getenv("ACCESS_CONTROL") {
			return (true)
		}
	}
	return (false)
}

func checkRedir(redirectAsk string) string {

	headers := map[string]string{"User-Agent": "naal/0.1.0 (+https://github.com/surajgoraya/naal)"}

	test := os.Getenv("CHECK_URL")
	client := request.Client{
		URL:    test,
		Method: "GET",
		Header: headers,
	}
	log.Println("Sending Request to GitHub For -" + redirectAsk)
	resp, err := client.Do()

	if err != nil {
		log.Println(resp, err)
		panic(err)
	}
	if resp.Code == 200 {
		var allLinks Link
		json.Unmarshal(resp.Data, &allLinks)
		for _, v := range allLinks.Links {
			// println(v.LinkID, redirectAsk)
			if v.LinkID == redirectAsk {

				return v.LinkTo
			}
		}
		return "/notFound"
	} else {
		return "/serverError"
	}
}
