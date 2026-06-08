# track-api

```mermaid
erDiagram

    User {
        string id PK
        string email
        string name
        Role role
        datetime createdAt
    }

    Course {
        string id PK
        string name
        string description
        int capacity
        string semester
        string teacherId FK
    }

    EvaluationWeight {
        string id PK
        string courseId FK
        EvaluationType type
        float weight
    }

    Enrollment {
        string id PK
        string studentId FK
        string courseId FK
    }

    Grade {
        string id PK
        string studentId FK
        string courseId FK
        EvaluationType evaluationType
        float value
        string createdById FK
        datetime createdAt
    }

    AttendanceSession {
        string id PK
        string courseId FK
        date date
    }

    AttendanceRecord {
        string id PK
        string sessionId FK
        string studentId FK
        boolean present
    }

    User ||--o{ Course : teaches
    User ||--o{ Enrollment : enrolls
    Course ||--o{ Enrollment : contains

    Course ||--o{ EvaluationWeight : defines

    User ||--o{ Grade : receives
    Course ||--o{ Grade : contains
    User ||--o{ Grade : creates

    Course ||--o{ AttendanceSession : has
    AttendanceSession ||--o{ AttendanceRecord : contains
    User ||--o{ AttendanceRecord : attends
```

### Create an admin user

```bash
npm run create:admin -- admin@example.com supersecret "Admin Name"
```

### Quickstart

- **API docs (Swagger):** visit `http://localhost:3000/api/docs` after starting the server.
- **Repository API:** See `api/README.md` for full setup and runtime instructions.

### Docker stack

Start API + Postgres + Redis + Loki + Grafana:

```bash
docker compose up --build -d
```

Then open:

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/api/docs`
- Grafana: `http://localhost:3001` (admin/admin)
