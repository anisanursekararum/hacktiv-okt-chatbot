from playwright.sync_api import sync_playwright
import time
import os

os.makedirs('docs/screenshots', exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',
        headless=True
    )
    context = browser.new_context(viewport={'width': 1280, 'height': 800})
    page = context.new_page()
    
    # 1. Login Page
    print('Capturing Login Page...')
    page.goto('https://hacktiv-okt-chatbot.vercel.app/', wait_until='networkidle')
    time.sleep(2)
    page.screenshot(path='docs/screenshots/01_login_page.png')
    
    # Set simulated user in localStorage to view dashboard pages
    page.evaluate('''() => {
        localStorage.setItem('my_pa_user_email', 'anisa.arum.work@gmail.com');
        localStorage.setItem('my_pa_user_name', 'Anisa Arum');
    }''')
    
    # 2. Chat / Dashboard View
    print('Capturing Chat / Dashboard View...')
    page.reload(wait_until='networkidle')
    time.sleep(2)
    page.screenshot(path='docs/screenshots/02_chat_view.png')
    
    # 3. Today View
    print('Capturing Today View...')
    page.goto('https://hacktiv-okt-chatbot.vercel.app/today', wait_until='networkidle')
    time.sleep(2)
    page.screenshot(path='docs/screenshots/03_today_view.png')
    
    # 4. Tasks View
    print('Capturing Tasks View...')
    page.goto('https://hacktiv-okt-chatbot.vercel.app/tasks', wait_until='networkidle')
    time.sleep(2)
    page.screenshot(path='docs/screenshots/04_tasks_view.png')
    
    # 5. Expenses View
    print('Capturing Expenses View...')
    page.goto('https://hacktiv-okt-chatbot.vercel.app/expenses', wait_until='networkidle')
    time.sleep(2)
    page.screenshot(path='docs/screenshots/05_expenses_view.png')
    
    # 6. Groceries View
    print('Capturing Groceries View...')
    page.goto('https://hacktiv-okt-chatbot.vercel.app/groceries', wait_until='networkidle')
    time.sleep(2)
    page.screenshot(path='docs/screenshots/06_groceries_view.png')

    # 7. Notes View
    print('Capturing Notes View...')
    page.goto('https://hacktiv-okt-chatbot.vercel.app/notes', wait_until='networkidle')
    time.sleep(2)
    page.screenshot(path='docs/screenshots/07_notes_view.png')

    # 8. Reminders View
    print('Capturing Reminders View...')
    page.goto('https://hacktiv-okt-chatbot.vercel.app/reminders', wait_until='networkidle')
    time.sleep(2)
    page.screenshot(path='docs/screenshots/08_reminders_view.png')

    # 9. Settings View
    print('Capturing Settings View...')
    page.goto('https://hacktiv-okt-chatbot.vercel.app/settings', wait_until='networkidle')
    time.sleep(2)
    page.screenshot(path='docs/screenshots/09_settings_view.png')

    browser.close()
    print('All screenshots captured successfully!')
