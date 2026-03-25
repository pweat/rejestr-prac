from playwright.sync_api import sync_playwright, expect
import jwt

def create_mock_token():
    payload = {
        "id": 1,
        "username": "testuser",
        "role": "admin"
    }
    return jwt.encode(payload, "a"*32, algorithm="HS256")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(record_video_dir="/app/verification/video")

        # Mock API calls
        context.route("**/api/verify-token*", lambda route: route.fulfill(
            status=200,
            json={"valid": True, "user": {"role": "admin"}}
        ))

        # Mock inventory items API to force pagination
        context.route("**/api/inventory*", lambda route: route.fulfill(
            status=200,
            json={
                "data": [{"id": i, "name": f"Item {i}", "quantity": 10, "unit": "szt", "min_stock_level": 5, "last_delivery_date": None, "is_ordered": False, "category_id": None} for i in range(1, 26)],
                "pagination": {"totalItems": 100, "currentPage": 1, "totalPages": 4, "limit": 25}
            }
        ))

        # Mock categories API
        context.route("**/api/inventory/categories*", lambda route: route.fulfill(
            status=200,
            json=[]
        ))

        page = context.new_page()

        # Set auth token
        page.goto("http://localhost:4173/")
        page.evaluate(f"localStorage.setItem('authToken', '{create_mock_token()}')")

        # Go to inventory page which has pagination
        page.goto("http://localhost:4173/magazyn")
        page.wait_for_timeout(1000)

        # Wait for pagination controls to be visible
        pagination_nav = page.locator('nav[aria-label="Nawigacja po stronach"]')
        expect(pagination_nav).to_be_visible()

        # Verify the previous button has the aria-label
        prev_button = page.locator('button[aria-label="Poprzednia strona"]')
        expect(prev_button).to_be_visible()

        # Verify the active page has aria-current
        current_page = page.locator('button[aria-current="page"]')
        expect(current_page).to_be_visible()
        expect(current_page).to_have_text("1")

        # Verify the next button has the aria-label
        next_button = page.locator('button[aria-label="Następna strona"]')
        expect(next_button).to_be_visible()

        page.screenshot(path="/app/verification/screenshot.png")
        page.wait_for_timeout(1000)

        context.close()
        browser.close()

if __name__ == "__main__":
    main()
