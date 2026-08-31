using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ToDoApi.Data;
using ToDoApi.DTOs;

namespace ToDoApi.Controllers;

/// <summary>
/// CRUD + Search + Pagination барои корҳо (ToDo)
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Tags("ToDo")]
public class ToDosController : ControllerBase
{
    private readonly AppDbContext _db;
    public ToDosController(AppDbContext db) => _db = db;

    // ============================================================
    // GET ALL — бо SEARCH + PAGINATION + FILTER + SORT
    // Ин муҳимтарин қисм аст!
    // ============================================================
    /// <summary>
    /// Ҳамаи корҳоро мегирад — бо search, pagination, filter, sort
    /// </summary>
    /// <remarks>
    /// Намуна:
    ///   /api/to-dos?page=1&amp;pageSize=5&amp;search=қабли&amp;categoryId=1&amp;completed=false&amp;sortBy=createdat&amp;sortDir=desc
    /// </remarks>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<ToDoDto>), 200)]
    public async Task<ActionResult<PagedResult<ToDoDto>>> GetAll([FromQuery] PaginationParams p)
    {
        // 1. Базовый запрос
        var query = _db.ToDos.Include(t => t.Category).AsQueryable();

        // 2. SEARCH — ҷустуҷӯ дар title ва description
        if (!string.IsNullOrWhiteSpace(p.Search))
        {
            var search = p.Search.ToLower();
            query = query.Where(t =>
                t.Title.ToLower().Contains(search) ||
                (t.Description != null && t.Description.ToLower().Contains(search)));
        }

        // 3. FILTER — аз рӯи категория
        if (p.CategoryId.HasValue)
            query = query.Where(t => t.CategoryId == p.CategoryId.Value);

        // 4. FILTER — аз рӯи ҳолат
        if (p.Completed.HasValue)
            query = query.Where(t => t.Completed == p.Completed.Value);

        // 5. SORT —:title ё createdat, asc ё desc
        query = (p.SortBy?.ToLower(), p.SortDir?.ToLower()) switch
        {
            ("title", "asc") => query.OrderBy(t => t.Title),
            ("title", "desc") => query.OrderByDescending(t => t.Title),
            ("createdat", "asc") => query.OrderBy(t => t.CreatedAt),
            ("createdat", "desc") => query.OrderByDescending(t => t.CreatedAt),
            _ => query.OrderByDescending(t => t.CreatedAt)
        };

        // 6. PAGINATION — саҳифабандӣ
        var totalCount = await query.CountAsync();
        var items = await query
            .Skip((p.Page - 1) * p.PageSize)
            .Take(p.PageSize)
            .Select(t => new ToDoDto
            {
                Id = t.Id,
                Title = t.Title,
                Description = t.Description,
                Completed = t.Completed,
                CreatedAt = t.CreatedAt,
                CategoryId = t.CategoryId,
                CategoryName = t.Category != null ? t.Category.Name : null
            })
            .ToListAsync();

        var result = new PagedResult<ToDoDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = p.Page,
            PageSize = p.PageSize
        };

        return Ok(result);
    }

    // ============================================================
    // GET BY ID
    // ============================================================
    /// <summary>Корро бо ID мегирад</summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(ToDoDto), 200)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<ToDoDto>> GetById(int id)
    {
        var todo = await _db.ToDos
            .Include(t => t.Category)
            .Where(t => t.Id == id)
            .Select(t => new ToDoDto
            {
                Id = t.Id,
                Title = t.Title,
                Description = t.Description,
                Completed = t.Completed,
                CreatedAt = t.CreatedAt,
                CategoryId = t.CategoryId,
                CategoryName = t.Category != null ? t.Category.Name : null
            })
            .FirstOrDefaultAsync();

        if (todo == null) return NotFound(new { message = $"Кори {id} ёфт нашуд" });
        return Ok(todo);
    }

    // ============================================================
    // POST — создание
    // ============================================================
    /// <summary>Кори нав месозад</summary>
    [HttpPost]
    [ProducesResponseType(typeof(ToDoDto), 201)]
    [ProducesResponseType(400)]
    public async Task<ActionResult<ToDoDto>> Create([FromBody] AddToDoDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { message = "Title лозим аст" });

        // Категория вуҷуд дорад?
        var catExists = await _db.Categories.AnyAsync(c => c.Id == dto.CategoryId);
        if (!catExists)
            return BadRequest(new { message = $"Категорияи {dto.CategoryId} вуҷуд надорад" });

        var todo = new Models.ToDo
        {
            Title = dto.Title,
            Description = dto.Description,
            Completed = false,
            CategoryId = dto.CategoryId,
            CreatedAt = DateTime.Now
        };

        _db.ToDos.Add(todo);
        await _db.SaveChangesAsync();

        var cat = await _db.Categories.FindAsync(dto.CategoryId);

        return CreatedAtAction(nameof(GetById), new { id = todo.Id }, new ToDoDto
        {
            Id = todo.Id,
            Title = todo.Title,
            Description = todo.Description,
            Completed = todo.Completed,
            CreatedAt = todo.CreatedAt,
            CategoryId = todo.CategoryId,
            CategoryName = cat?.Name
        });
    }

    // ============================================================
    // PUT — обновление
    // ============================================================
    /// <summary>Корро навсозӣ мекунад</summary>
    [HttpPut("{id}")]
    [ProducesResponseType(typeof(ToDoDto), 200)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<ToDoDto>> Update(int id, [FromBody] UpdateToDoDto dto)
    {
        var todo = await _db.ToDos.Include(t => t.Category).FirstOrDefaultAsync(t => t.Id == id);
        if (todo == null) return NotFound(new { message = $"Кори {id} ёфт нашуд" });

        if (dto.Title != null) todo.Title = dto.Title;
        if (dto.Description != null) todo.Description = dto.Description;
        if (dto.CategoryId.HasValue)
        {
            var catExists = await _db.Categories.AnyAsync(c => c.Id == dto.CategoryId.Value);
            if (!catExists) return BadRequest(new { message = $"Категорияи {dto.CategoryId} вуҷуд надорад" });
            todo.CategoryId = dto.CategoryId.Value;
        }

        await _db.SaveChangesAsync();

        return Ok(new ToDoDto
        {
            Id = todo.Id,
            Title = todo.Title,
            Description = todo.Description,
            Completed = todo.Completed,
            CreatedAt = todo.CreatedAt,
            CategoryId = todo.CategoryId,
            CategoryName = todo.Category?.Name
        });
    }

    // ============================================================
    // PUT completed — ҳолати иҷро
    // ============================================================
    /// <summary>Ҳолати иҷрошудаи корро тағйир медиҳад</summary>
    [HttpPut("completed")]
    [ProducesResponseType(typeof(ToDoDto), 200)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<ToDoDto>> UpdateCompleted([FromBody] UpdateCompletedDto dto)
    {
        var todo = await _db.ToDos.Include(t => t.Category).FirstOrDefaultAsync(t => t.Id == dto.TodoId);
        if (todo == null) return NotFound(new { message = $"Кори {dto.TodoId} ёфт нашуд" });

        todo.Completed = dto.Completed;
        await _db.SaveChangesAsync();

        return Ok(new ToDoDto
        {
            Id = todo.Id,
            Title = todo.Title,
            Completed = todo.Completed,
            CategoryId = todo.CategoryId,
            CategoryName = todo.Category?.Name
        });
    }

    // ============================================================
    // DELETE — удаление (несколько ID)
    // ============================================================
    /// <summary>Корҳоро нест мекунад (ids: "1,2,3")</summary>
    [HttpDelete]
    [ProducesResponseType(200)]
    [ProducesResponseType(404)]
    public async Task<ActionResult> Delete([FromQuery] string ids)
    {
        var idList = ids.Split(',')
            .Select(s => int.TryParse(s.Trim(), out var v) ? v : (int?)null)
            .Where(v => v.HasValue)
            .Select(v => v!.Value)
            .ToList();

        if (!idList.Any()) return BadRequest(new { message = "ID-ҳои дуруст лозиманд" });

        var todos = await _db.ToDos.Where(t => idList.Contains(t.Id)).ToListAsync();
        if (!todos.Any()) return NotFound(new { message = "Корҳо ёфт нашуданд" });

        _db.ToDos.RemoveRange(todos);
        await _db.SaveChangesAsync();

        return Ok(new { message = $"{todos.Count} кор нест шуд", deletedIds = todos.Select(t => t.Id) });
    }

    // ============================================================
    // DELETE BY ID
    // ============================================================
    /// <summary>Корро бо ID нест мекунад</summary>
    [HttpDelete("{id}")]
    [ProducesResponseType(200)]
    [ProducesResponseType(404)]
    public async Task<ActionResult> DeleteById(int id)
    {
        var todo = await _db.ToDos.FindAsync(id);
        if (todo == null) return NotFound(new { message = $"Кори {id} ёфт нашуд" });

        _db.ToDos.Remove(todo);
        await _db.SaveChangesAsync();
        return Ok(new { message = $"Кори {id} нест шуд" });
    }
}
