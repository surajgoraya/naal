package main

import (
	"context"
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

func main() {

	err := godotenv.Load(".env")
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	app := fiber.New()

	app.Static("/bossman", "./naal-admin/build")

	app.Get("/auth/authenticate", func(c *fiber.Ctx) error {
		clientID := os.Getenv("GITHUB_CLIENTID")
		baseURL := "https://github.com/login/oauth/authorize?scope=user repo admin:read:org&client_id="
		generate := fmt.Sprintf("%s%s", baseURL, clientID)
		log.Println(generate)
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
			log.Println("Authenticated: ", resp.Code, string(resp.Data), err)
			respToken := strings.Split(string(resp.Data), "=")
			authToken := strings.Split(respToken[1], "&")[0]
			log.Println(authToken)

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

	app.Static("/auth/imposter", "./internal_static")

	app.Get("/*", func(c *fiber.Ctx) error {
		return c.SendString("Hello world! 👳🏻‍♂️👋🏽")
	})

	app.Listen(":3001")
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
		panic("error")
	}

	for _, v := range repos {
		if *v.URL == os.Getenv("ACCESS_CONTROL") {
			return (true)
		}
	}
	return (false)
}
