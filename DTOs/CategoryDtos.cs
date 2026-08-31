namespace ToDoApi.DTOs;

// ============================================================
// CATEGORY DTOs
// ============================================================
public class CategoryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int ToDoCount { get; set; }
}

public class AddCategoryDto
{
    /// <summary>Номи категория (2-50 аломат)</summary>
    /// <example>Кор</example>
    public string Name { get; set; } = string.Empty;

    /// <summary>Тавсифи категория</summary>
    /// <example>Корҳои рӯзона</example>
    public string? Description { get; set; }
}

public class UpdateCategoryDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}
