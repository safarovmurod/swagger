# ToDo WebApi — ASP.NET Core + Swagger

A complete REST API for managing ToDo items and categories, with **CRUD, Search, Pagination, Filtering, and Sorting** — plus auto-generated Swagger UI documentation.

> Барои идораи корҳо ва категорияҳо — API-и пурра бо Swagger UI.
> Complete backend with GET, POST, PUT, DELETE, Search, Pagination.

---

## 🚀 Quick Start

### Option A — Run with .NET CLI

```bash
cd ToDoApi
dotnet restore
dotnet run
```

Then open: **http://localhost:5000/swagger**

### Option B — Run with Docker

```bash
docker build -t todo-api .
docker run -p 8080:8080 todo-api
```

Then open: **http://localhost:8080/swagger**

---

## 📋 API Endpoints

### Category

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | Get all categories |
| GET | `/api/categories/{id}` | Get category by ID |
| POST | `/api/categories` | Create a new category |
| PUT | `/api/categories/{id}` | Update a category |
| DELETE | `/api/categories?ids=1,2,3` | Delete multiple categories |
| DELETE | `/api/categories/{id}` | Delete one category |

### ToDo — with Search + Pagination

| Method | Endpoint | Query Params |
|--------|----------|--------------|
| GET | `/api/to-dos` | `?page=1&pageSize=5&search=keyword&categoryId=1&completed=false&sortBy=createdat&sortDir=desc` |
| GET | `/api/to-dos/{id}` | — |
| POST | `/api/to-dos` | Body: `{title, description, categoryId}` |
| PUT | `/api/to-dos/{id}` | Body: `{title?, description?, categoryId?}` |
| PUT | `/api/to-dos/completed` | Body: `{todoId, completed}` |
| DELETE | `/api/to-dos?ids=1,2` | Delete multiple |
| DELETE | `/api/to-dos/{id}` | Delete one |

---

## 🔍 Search + Pagination Example

```
GET /api/to-dos?page=1&pageSize=5&search=meeting&categoryId=1&completed=false&sortBy=createdat&sortDir=desc
```

**Response:**

```json
{
  "items": [
    {
      "id": 1,
      "title": "Team meeting",
      "description": "Weekly sync",
      "completed": false,
      "createdAt": "2026-08-31T12:00:00Z",
      "categoryId": 1,
      "categoryName": "Work"
    }
  ],
  "totalCount": 12,
  "page": 1,
  "pageSize": 5,
  "totalPages": 3,
  "hasPrevious": false,
  "hasNext": true
}
```

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | int | 1 | Page number (starts at 1) |
| `pageSize` | int | 5 | Items per page |
| `search` | string? | — | Search in title + description |
| `categoryId` | int? | — | Filter by category |
| `completed` | bool? | — | Filter by completion status |
| `sortBy` | string | createdat | Sort: `title` or `createdat` |
| `sortDir` | string | desc | Sort direction: `asc` or `desc` |

---

## 📁 Project Structure

```
ToDoApi/
├── Program.cs                    # App setup + Swagger config
├── ToDoApi.csproj                # NuGet packages
├── appsettings.json              # Config
├── Dockerfile                    # Docker support
├── .gitignore
├── LICENSE
├── Properties/
│   └── launchSettings.json       # Launch settings
├── Data/
│   ├── AppDbContext.cs           # EF Core DbContext
│   └── SeedData.cs               # Seed data (12 todos, 3 categories)
├── Models/
│   ├── Category.cs               # Category model
│   └── ToDo.cs                   # ToDo model
├── DTOs/
│   ├── CategoryDtos.cs           # Category DTOs
│   └── ToDoDtos.cs               # ToDo DTOs + PaginationParams + PagedResult
└── Controllers/
    ├── CategoriesController.cs   # Category CRUD
    └── ToDosController.cs        # ToDo CRUD + Search + Pagination
```

---

## ⚙️ Configuration

### Switch from InMemory to SQL Server

In `Program.cs`, replace:

```csharp
// InMemory (for testing)
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseInMemoryDatabase("ToDoDb"));
```

With:

```csharp
// SQL Server
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("Default")));
```

Then add the EF Core SQL Server package:

```bash
dotnet add package Microsoft.EntityFrameworkCore.SqlServer
```

### Add a Migration (when using SQL Server)

```bash
dotnet tool install --global dotnet-ef    # one-time
dotnet ef migrations add InitialCreate
dotnet ef database update
```

---

## ✅ Features

- ✅ **GET** — retrieve all or by ID
- ✅ **POST** — create new items
- ✅ **PUT** — update items (full + partial)
- ✅ **DELETE** — single or multiple IDs
- ✅ **Search** — keyword search in title + description
- ✅ **Pagination** — page + pageSize with metadata
- ✅ **Filter** — by category and completion status
- ✅ **Sort** — by title or creation date, ascending/descending
- ✅ **Swagger UI** — auto-generated docs with examples
- ✅ **JWT Auth** — Bearer token support in Swagger
- ✅ **Seed Data** — 12 todos and 3 categories ready to test
- ✅ **Docker** — containerized for easy deployment
- ✅ **CORS** — enabled for frontend integration

---

## 🛠 Tech Stack

- **ASP.NET Core 8.0** Web API
- **Entity Framework Core** (InMemory for dev, SQL Server ready)
- **Swashbuckle.AspNetCore** (Swagger UI)
- **JWT Bearer** authentication ready

---

## 📄 License

MIT — see [LICENSE](LICENSE)
