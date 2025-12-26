import { TargetLanguage } from '../types';

export type UILanguage = TargetLanguage;

/**
 * UI translations for all interface elements
 * Maps language codes to translation dictionaries
 */
const uiTranslations: Record<UILanguage, Record<string, string>> = {
  eng: {
    // Welcome messages
    'welcome_back': 'Welcome back! 👋',
    'active_lesson': 'You have an active lesson in',
    'what_to_do': 'What would you like to do?',
    'resume_lesson': '✅ Resume lesson',
    'start_new': '❌ Start new lesson',

    // Language selection
    'select_language': 'Select your learning language:',
    'language_eng': '🇬🇧 English',
    'language_ua': '🇺🇦 Ukrainian',
    'language_kharkiv': '🎭 Kharkiv (Ukrainian Dialect)',

    // Level selection
    'select_level': 'Select your learning level:',
    'level_basic': '🎓 Basic',
    'level_middle': '📚 Middle',
    'level_middle_slavic': '🔗 Middle-Slavic',
    'level_misc': '🎭 Miscellaneous',
    'level_language_comparison': '🌐 Language Comparison',
    'level_expressions': '💬 Expressions',
    'basic_desc': 'Fundamental phrases and greetings',
    'middle_desc': 'Complex sentences and grammar',
    'middle_slavic_desc': 'Slavic language connections',
    'misc_desc': 'Idioms, slang, and cultural',
    'language_comparison_desc': 'Compare Bulgarian with other languages',
    'expressions_desc': 'Common expressions and sayings',

    // Category selection
    'select_category': 'Select a lesson category:',
    'no_categories': 'No categories available',

    // Categories
    'cat_direction': 'Direction',
    'cat_greetings': 'Greetings',
    'cat_help': 'Help',
    'cat_restaurant': 'Restaurant',
    'cat_shopping': 'Shopping',
    'cat_aorist-past': 'Aorist Past',
    'cat_future': 'Future',
    'cat_imperfect-past': 'Imperfect Past',
    'cat_present': 'Present',
    'cat_question': 'Question',
    'cat_false-friends': 'False Friends',
    'cat_modern-lexicon': 'Modern Lexicon',
    'cat_swear-words': 'Swear Words',
    'cat_folkclore': 'Folklore',
    'cat_idioms': 'Idioms',
    'cat_names': 'Names',
    'cat_political-slang': 'Political Slang',
    'cat_weather': 'Weather',
    'cat_youth-slang': 'Youth Slang',
    'cat_grammar': 'Grammar',
    'cat_vocabulary': 'Vocabulary',
    'cat_phonetics': 'Phonetics',
    'cat_syntax': 'Syntax',
    'cat_food': 'Food',
    'cat_love': 'Love',
    'cat_rakiya': 'Rakiya',
    'cat_soft-insult': 'Soft Insults',

    // Lesson controls
    'show_translation': '📖 Show translation',
    'add_favourite': '⭐ Add to favourites',
    'back_to_categories': '🔙 Back',
    'skip_next': '⏭️ Skip to next',
    'change_folder': '📚 Change folder',
    'main_menu': '🏠 Main menu',
    'previous': '⬅️ Previous',
    'next': 'Next ➡️',
    'exit_lesson': '❌ Exit lesson',
    'choose_another': '📚 Choose another category',

    // Lesson messages
    'lesson_started': '🎓 Lesson started! Good luck!',
    'translation_revealed': '🎯 Translation revealed! 👀',
    'next_clicked': '➡️ Next!',
    'previous_clicked': '⬅️ Previous!',
    'congratulations': '🎉 CONGRATULATIONS! 🎉',
    'lesson_completed': 'You completed the',
    'sentences_mastered': 'sentences mastered',
    'great_job': '💪 Great job! Ready for the next category?',
    'at_beginning': '✨ You\'re at the beginning!',
    'no_sentences': '❌ No sentences available.',

    // Errors
    'error_occurred': 'Error occurred',
    'no_progress_found': 'No progress found',
    'session_expired': 'Your session has expired. Please start again.',

    // Progress
    'progress_title': '📊 **Your Learning Progress**',
    'progress_no_lessons': '📚 No lessons started yet. Use /start to begin!',

    // Status
    'loading': '⏳ Loading...',
    'lesson': '📚 Lesson',
    'of': 'of',
    'click_reveal': '✨ Click button to reveal translation',

    // Profile commands
    'change_language': 'Change language',
    'back': '🔙 Back',
    'confirm': '✅ Confirm',
    'cancel': '❌ Cancel',

    // Refresh command
    'refresh_options': 'What would you like to clear?',
    'clear_results': 'Clear all progress results',
    'clear_messages': 'Clear chat messages',
    'results_cleared': 'All mastery results cleared!',
    'clear_messages_info': 'Clear messages feature coming soon! This will help keep your chat tidy.',
    'messages_cleared': 'Chat messages cleared!',
    'messages_cleared_info': 'Your recent lesson messages have been removed to keep your chat clean.',
  },

  kharkiv: {
    // Welcome messages
    'welcome_back': 'Добро пожаловать назад! 👋',
    'active_lesson': 'У вас есть активный урок в',
    'what_to_do': 'Шо вы хотели бы делать?',
    'resume_lesson': '✅ Продолжить урок',
    'start_new': '❌ Начать новый урок',

    // Language selection
    'select_language': 'Выберите язык обучения:',
    'language_eng': '🇬🇧 Английский',
    'language_ua': '🇺🇦 Украинский',
    'language_kharkiv': '🎭 Харьков (слобожанский говор)',

    // Level selection
    'select_level': 'Выберите уровень обучения:',
    'level_basic': '🎓 Базовый',
    'level_middle': '📚 Средний',
    'level_middle_slavic': '🔗 Среднеславянский',
    'level_misc': '🎭 Разное',
    'level_language_comparison': '🌐 Сравнение языков',
    'level_expressions': '💬 Выражения',
    'basic_desc': 'Базовые фразы и приветствия',
    'middle_desc': 'Сложные предложения и грамматика',
    'middle_slavic_desc': 'Связи со славянскими языками',
    'misc_desc': 'Идиомы, сленг и культура',
    'language_comparison_desc': 'Сравнить болгарский с другими языками',
    'expressions_desc': 'Распространенные выражения и пословицы',

    // Category selection
    'select_category': 'Выберите категорию урока:',
    'no_categories': 'Категории недоступны',

    // Categories
    'cat_direction': 'Направления',
    'cat_greetings': 'Приветствия',
    'cat_help': 'Помощь',
    'cat_restaurant': 'Ресторан',
    'cat_shopping': 'Покупки',
    'cat_aorist-past': 'Аорист (Давнопрошедшее)',
    'cat_future': 'Будущее',
    'cat_imperfect-past': 'Имперфект (Прошедшее)',
    'cat_present': 'Настоящее',
    'cat_question': 'Вопросы',
    'cat_false-friends': 'Ложные друзья',
    'cat_modern-lexicon': 'Современный словарь',
    'cat_swear-words': 'Ругательства',
    'cat_folkclore': 'Фольклор',
    'cat_idioms': 'Идиомы',
    'cat_names': 'Имена',
    'cat_political-slang': 'Политический сленг',
    'cat_weather': 'Погода',
    'cat_youth-slang': 'Молодёжный сленг',
    'cat_grammar': 'Грамматика',
    'cat_vocabulary': 'Словарь',
    'cat_phonetics': 'Фонетика',
    'cat_syntax': 'Синтаксис',
    'cat_food': 'Еда',
    'cat_love': 'Любовь',
    'cat_rakiya': 'Ракия',
    'cat_soft-insult': 'Мягкие оскорбления',

    // Lesson controls
    'show_translation': '📖 Показать перевод',
    'add_favourite': '⭐ Добавить в избранное',
    'back_to_categories': '🔙 Назад',
    'skip_next': '⏭️ Перейти к следующему',
    'change_folder': '📚 Сменить уровень',
    'change_level': '📈 Сменить уровень',
    'change_category': '🏷️ Сменить категорию',
    'main_menu': '🏠 Главное меню',
    'previous': '⬅️ Предыдущий',
    'next': 'Следующий ➡️',
    'exit_lesson': '❌ Выйти из урока',
    'choose_another': '📚 Выбрать другую категорию',

    // Lesson messages
    'lesson_started': '🎓 Урок начался! Удачи!',
    'translation_revealed': '🎯 Перевод раскрыт! 👀',
    'next_clicked': '➡️ Дальше!',
    'previous_clicked': '⬅️ Назад!',
    'congratulations': '🎉 ПОЗДРАВЛЯЕМ! 🎉',
    'lesson_completed': 'Вы завершили',
    'sentences_mastered': 'предложений освоено',
    'great_job': '💪 Отличная работа! Готовы к следующей категории?',
    'at_beginning': '✨ Вы в начале!',
    'no_sentences': '❌ Нет доступных предложений.',

    // Errors
    'error_occurred': 'Произошла ошибка',
    'no_progress_found': 'Прогресс не найден',
    'session_expired': 'Ваша сессия закончилась. Пожалуйста, начните заново.',

    // Progress
    'progress_title': '📊 **Ваш прогресс обучения**',
    'progress_no_lessons': '📚 Уроки еще не начаты. Используйте /start для начала!',

    // Status
    'loading': '⏳ Загрузка...',
    'lesson': '📚 Урок',
    'of': 'из',
    'click_reveal': '✨ Нажмите кнопку, чтобы раскрыть перевод',

    // Profile commands
    'change_language': 'Измените язык',
    'back': '🔙 Назад',
    'confirm': '✅ Подтвердить',
    'cancel': '❌ Отмена',

    // Refresh command
    'refresh_options': 'Что вы хотите очистить?',
    'clear_results': 'Очистить все результаты прогресса',
    'clear_messages': 'Очистить сообщения чата',
    'results_cleared': 'Все результаты мастерства очищены!',
    'clear_messages_info': 'Функция очистки сообщений скоро появится! Это поможет содержать ваш чат в чистоте.',
    'messages_cleared': 'Сообщения чата очищены!',
    'messages_cleared_info': 'Ваши недавние сообщения урока удалены, чтобы ваш чат был чистым.',
  },

  ua: {
    // Welcome messages
    'welcome_back': 'Ласкаво просимо назад! 👋',
    'active_lesson': 'У вас є активний урок у',
    'what_to_do': 'Що б ви хотіли робити?',
    'resume_lesson': '✅ Продовжити урок',
    'start_new': '❌ Почати новий урок',

    // Language selection
    'select_language': 'Виберіть мову навчання:',
    'language_eng': '🇬🇧 Англійська',
    'language_ua': '🇺🇦 Українська',
    'language_kharkiv': '🎭 Харків (український діалект)',

    // Level selection
    'select_level': 'Виберіть рівень навчання:',
    'level_basic': '🎓 Базовий',
    'level_middle': '📚 Середній',
    'level_middle_slavic': '🔗 Середньослов\'янський',
    'level_misc': '🎭 Різне',
    'level_language_comparison': '🌐 Порівняння мов',
    'level_expressions': '💬 Вирази',
    'basic_desc': 'Базові фрази та привітання',
    'middle_desc': 'Складні речення та граматика',
    'middle_slavic_desc': 'Зв\'язки зі слов\'янськими мовами',
    'misc_desc': 'Ідіоми, сленг та культура',
    'language_comparison_desc': 'Порівняти болгарську з іншими мовами',
    'expressions_desc': 'Поширені вирази та приказки',

    // Category selection
    'select_category': 'Виберіть категорію уроку:',
    'no_categories': 'Категорії недоступні',

    // Categories
    'cat_direction': 'Напрямок',
    'cat_greetings': 'Привітання',
    'cat_help': 'Допомога',
    'cat_restaurant': 'Ресторан',
    'cat_shopping': 'Покупки',
    'cat_aorist-past': 'Аорист (Давноминуле)',
    'cat_future': 'Майбутнє',
    'cat_imperfect-past': 'Імперфект (Минуле)',
    'cat_present': 'Теперішнє',
    'cat_question': 'Питання',
    'cat_false-friends': 'Хибні друзі',
    'cat_modern-lexicon': 'Сучасна лексика',
    'cat_swear-words': 'Лайки',
    'cat_folkclore': 'Фольклор',
    'cat_idioms': 'Ідіоми',
    'cat_names': 'Імена',
    'cat_political-slang': 'Політичний сленг',
    'cat_weather': 'Погода',
    'cat_youth-slang': 'Молодіжний сленг',
    'cat_grammar': 'Граматика',
    'cat_vocabulary': 'Словник',
    'cat_phonetics': 'Фонетика',
    'cat_syntax': 'Синтаксис',
    'cat_food': 'Їжа',
    'cat_love': 'Любов',
    'cat_rakiya': 'Ракія',
    'cat_soft-insult': 'М\'які образи',

    // Lesson controls
    'show_translation': '📖 Показати переклад',
    'add_favourite': '⭐ Додати до улюблених',
    'back_to_categories': '🔙 Назад',
    'skip_next': '⏭️ Перейти до наступного',
    'change_folder': '📚 Змінити рівень',
    'change_level': '📈 Змінити рівень',
    'change_category': '🏷️ Змінити категорію',
    'main_menu': '🏠 Головне меню',
    'previous': '⬅️ Попередній',
    'next': 'Наступний ➡️',
    'exit_lesson': '❌ Вийти з уроку',
    'choose_another': '📚 Вибрати іншу категорію',

    // Lesson messages
    'lesson_started': '🎓 Урок розпочався! Удачі!',
    'translation_revealed': '🎯 Переклад розкрито! 👀',
    'next_clicked': '➡️ Далі!',
    'previous_clicked': '⬅️ Назад!',
    'congratulations': '🎉 ВІТАЄМО! 🎉',
    'lesson_completed': 'Ви завершили',
    'sentences_mastered': 'речення засвоєно',
    'great_job': '💪 Чудова робота! Готові до наступної категорії?',
    'at_beginning': '✨ Ви на початку!',
    'no_sentences': '❌ Немає доступних речень.',

    // Errors
    'error_occurred': 'Сталася помилка',
    'no_progress_found': 'Прогрес не знайдено',
    'session_expired': 'Ваша сесія закінчилася. Будь ласка, почніть заново.',

    // Progress
    'progress_title': '📊 **Ваш прогрес навчання**',
    'progress_no_lessons': '📚 Уроки ще не розпочаті. Використайте /start для початку!',

    // Status
    'loading': '⏳ Завантаження...',
    'lesson': '📚 Урок',
    'of': 'з',
    'click_reveal': '✨ Натисніть кнопку, щоб розкрити переклад',

    // Profile commands
    'change_language': 'Змініть мову',
    'back': '🔙 Назад',
    'confirm': '✅ Підтвердити',
    'cancel': '❌ Скасувати',

    // Refresh command
    'refresh_options': 'Що ви хочете очистити?',
    'clear_results': 'Очистити всі результати прогресу',
    'clear_messages': 'Очистити повідомлення чату',
    'results_cleared': 'Всі результати мастерства очищено!',
    'clear_messages_info': 'Функція очистки повідомлень скоро з\'явиться! Це допоможе тримати ваш чат у чистоті.',
    'messages_cleared': 'Повідомлення чату очищено!',
    'messages_cleared_info': 'Ваші недавні повідомлення уроку видалено, щоб ваш чат був чистим.',
  },
};

/**
 * Get a translated UI string for a given language
 * @param key - Translation key
 * @param language - Target language (eng, kharkiv, ua)
 * @returns Translated string or the key if not found
 */
export function getUIText(key: string, language: UILanguage = 'eng'): string {
  const translations = uiTranslations[language] || uiTranslations.eng;
  return translations[key] || key;
}
