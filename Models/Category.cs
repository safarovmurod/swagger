namespace ToDoApi.Models;

public class Category
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    // Navigation
    public List<ToDo> ToDos { get; set; } = new();
}
