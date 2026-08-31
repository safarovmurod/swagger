using Microsoft.EntityFrameworkCore;

namespace ToDoApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> opt) : base(opt) { }

    public DbSet<ToDoApi.Models.Category> Categories => Set<ToDoApi.Models.Category>();
    public DbSet<ToDoApi.Models.ToDo> ToDos => Set<ToDoApi.Models.ToDo>();
}
