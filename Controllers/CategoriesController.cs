using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ToDoApi.Data;
using ToDoApi.DTOs;

namespace ToDoApi.Controllers;

/// <summary>
/// CRUD барои категорияҳо
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Tags("Category")]
public class CategoriesController : ControllerBase
{
    private readonly AppDbContext _db;
    public CategoriesController(AppDbContext db) => _db = db;

    // ============================================================
    // GET ALL — ҳамаи категорияҳо
    // ============================================================
    /// <summary>Ҳамаи категорияҳоро мегирад</summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<CategoryDto>), 200)]
    public async Task<ActionResult<List<CategoryDto>>> GetAll()
    {
        var cats = await _db.Categories
            .Select(c => new CategoryDto
            {
                Id = c.Id,
                Name = c.Name,
                Description = c.Description,
                ToDoCount = c.ToDos.Count
            })
            .ToListAsync();
        return Ok(cats);
    }

    // ============================================================
    // GET BY ID
    // ============================================================
    /// <summary>Категорияро бо ID мегирад</summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(CategoryDto), 200)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<CategoryDto>> GetById(int id)
    {
        var cat = await _db.Categories
            .Where(c => c.Id == id)
            .Select(c => new CategoryDto
            {
                Id = c.Id,
                Name = c.Name,
                Description = c.Description,
                ToDoCount = c.ToDos.Count
            })
            .FirstOrDefaultAsync();

        if (cat == null) return NotFound(new { message = $"Категорияи {id} ёфт нашуд" });
        return Ok(cat);
    }

    // ============================================================
    // POST — создание
    // ============================================================
    /// <summary>Категорияи нав месозад</summary>
    [HttpPost]
    [ProducesResponseType(typeof(CategoryDto), 201)]
    [ProducesResponseType(400)]
    public async Task<ActionResult<CategoryDto>> Create([FromBody] AddCategoryDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Ном лозим аст" });

        var cat = new Models.Category { Name = dto.Name, Description = dto.Description };
        _db.Categories.Add(cat);
        await _db.SaveChangesAsync();

        var result = new CategoryDto
        {
            Id = cat.Id,
            Name = cat.Name,
            Description = cat.Description,
            ToDoCount = 0
        };
        return CreatedAtAction(nameof(GetById), new { id = cat.Id }, result);
    }

    // ============================================================
    // PUT — обновление
    // ============================================================
    /// <summary>Категорияро навсозӣ мекунад</summary>
    [HttpPut("{id}")]
    [ProducesResponseType(typeof(CategoryDto), 200)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<CategoryDto>> Update(int id, [FromBody] UpdateCategoryDto dto)
    {
        var cat = await _db.Categories.FindAsync(id);
        if (cat == null) return NotFound(new { message = $"Категорияи {id} ёфт нашуд" });

        cat.Name = dto.Name;
        cat.Description = dto.Description;
        await _db.SaveChangesAsync();

        return Ok(new CategoryDto { Id = cat.Id, Name = cat.Name, Description = cat.Description });
    }

    // ============================================================
    // DELETE — удаление (поддержка нескольких ID)
    // ============================================================
    /// <summary>Категорияҳоро нест мекунад (ids: "1,2,3")</summary>
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

        var cats = await _db.Categories.Where(c => idList.Contains(c.Id)).ToListAsync();
        if (!cats.Any()) return NotFound(new { message = "Категорияҳо ёфт нашуданд" });

        _db.Categories.RemoveRange(cats);
        await _db.SaveChangesAsync();

        return Ok(new { message = $"{cats.Count} категория нест шуд", deletedIds = cats.Select(c => c.Id) });
    }

    // ============================================================
    // DELETE BY ID
    // ============================================================
    /// <summary>Категорияро бо ID нест мекунад</summary>
    [HttpDelete("{id}")]
    [ProducesResponseType(200)]
    [ProducesResponseType(404)]
    public async Task<ActionResult> DeleteById(int id)
    {
        var cat = await _db.Categories.FindAsync(id);
        if (cat == null) return NotFound(new { message = $"Категорияи {id} ёфт нашуд" });

        _db.Categories.Remove(cat);
        await _db.SaveChangesAsync();
        return Ok(new { message = $"Категорияи {id} нест шуд" });
    }
}
