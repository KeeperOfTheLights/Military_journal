# Миграция системы оценок

## Изменения

Система оценок была полностью переделана под события оценивания (рубежные контроли и экзамены).

### Что изменилось:

**Backend:**
- Создана новая модель `AssessmentEvent` (событие оценивания) с полями:
  - `name` - название события (например, "Рубежный контроль 1")
  - `event_type` - тип (midterm_1, midterm_2, exam_1, exam_2, custom)
  - `group_id` - группа
  - `subject_id` - предмет
  - `date`, `semester`, `academic_year` - дата и период
  - `max_score` - максимальный балл (по умолчанию 100)
  
- Модель `Grade` теперь связана с событием через `assessment_event_id`
  - Убраны поля: `subject_id`, `grade_type`, `max_score`, `weight`, `date`, `semester`, `academic_year`, `description`
  - Оставлены: `student_id`, `assessment_event_id`, `score`, `comment`

- Новые API endpoints:
  - `POST /api/assessment-events` - создать событие
  - `GET /api/assessment-events` - список событий
  - `GET /api/assessment-events/{id}/grades` - оценки по событию
  - `POST /api/grades/bulk` - массовое сохранение оценок

**Frontend:**
- Полностью переделан компонент `GradesEntry.jsx`:
  - Список событий оценивания
  - Создание новых событий
  - Выставление оценок всем студентам группы для каждого события
  - Цветовая индикация оценок (A/B/C/D/F)

## Миграция базы данных

**ВАЖНО:** Эта миграция удалит все существующие оценки!

### Шаги миграции:

1. Создайте backup базы данных:
```bash
# PostgreSQL
pg_dump -U postgres military_journal > backup_before_grades_migration.sql

# SQLite
cp books.db books_backup_before_grades_migration.db
```

2. Запустите миграцию Alembic:
```bash
alembic upgrade head
```

3. Проверьте, что миграция прошла успешно:
```bash
alembic current
```

Должна показаться ревизия: `abc123456789 (head)`

## Использование новой системы

1. **Создайте событие оценивания:**
   - Выберите группу и предмет
   - Нажмите "Создать событие"
   - Заполните название (например, "Рубежный контроль 1")
   - Выберите тип события
   - Укажите дату, семестр и учебный год
   - Сохраните

2. **Выставьте оценки:**
   - В списке событий нажмите кнопку "Оценки"
   - Введите оценки для каждого студента (0-100)
   - Можно добавить комментарии
   - Нажмите "Сохранить оценки"

3. **Доступные типы событий:**
   - Рубежный контроль 1 (midterm_1)
   - Рубежный контроль 2 (midterm_2)
   - Экзамен 1 (exam_1)
   - Экзамен 2 (exam_2)
   - Другое (custom) - для дополнительных событий

## Откат (если нужно)

Если что-то пошло не так:

```bash
# Откат миграции
alembic downgrade -1

# Восстановление из backup
# PostgreSQL
psql -U postgres military_journal < backup_before_grades_migration.sql

# SQLite
cp books_backup_before_grades_migration.db books.db
```
