namespace ToDoApi.DTOs;

// ============================================================
// TODO DTOs
// ============================================================
public class ToDoDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool Completed { get; set; }
    public DateTime CreatedAt { get; set; }
    public int CategoryId { get; set; }
    public string? CategoryName { get; set; }
}

public class AddToDoDto
{
    /// <summary>Номи кор</summary>
    /// <example>Қабли муштариён</example>
    public string Title { get; set; } = string.Empty;

    /// <summary>Тавсифи кор</summary>
    /// <example>10 муштарӣро занг зан</example>
    public string? Description { get; set; }

    /// <summary>ID-и категория</summary>
    /// <example>1</example>
    public int CategoryId { get; set; }
}

public class UpdateToDoDto
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public int? CategoryId { get; set; }
}

public class UpdateCompletedDto
{
    public int TodoId { get; set; }
    public bool Completed { get; set; }
}

// ============================================================
// PAGINATION — ин муҳимтарин қисм аст!
// ============================================================
public class PaginationParams
{
    /// <summary>Саҳифа (аз 1 сар мешавад)</summary>
    /// <example>1</example>
    public int Page { get; set; } = 1;

    /// <summary>Миқдори ҷузъҳо дар як саҳифа</summary>
    /// <example>5</example>
    public int PageSize { get; set; } = 5;

    /// <summary>Ҷустуҷӯ бо калима (search)</summary>
    /// <example>қабли</example>
    public string? Search { get; set; }

    /// <summary>Филтр: аз рӯи категория</summary>
    /// <example>1</example>
    public int? CategoryId { get; set; }

    /// <summary>Филтр: аз рӯи ҳолат (true = иҷрошуда, false = иҷронашуда)</summary>
    /// <example>false</example>
    public bool? Completed { get; set; }

    /// <summary>Тартибот: title, createdat</summary>
    /// <example>createdat</example>
    public string SortBy { get; set; } = "createdat";

    /// <summary>Тартибот: asc ё desc</summary>
    /// <example>desc</example>
    public string SortDir { get; set; } = "desc";
}

public class PagedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
    public bool HasPrevious => Page > 1;
    public bool HasNext => Page < TotalPages;
}
