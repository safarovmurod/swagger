namespace ToDoApi.Models;

public class ToDo
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool Completed { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.Now;

    // Foreign key
    public int CategoryId { get; set; }
    public Category? Category { get; set; }
}
