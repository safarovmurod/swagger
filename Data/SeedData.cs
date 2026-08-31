namespace ToDoApi.Data;

public static class SeedData
{
    public static void Init(AppDbContext db)
    {
        if (db.Categories.Any()) return;

        var work = new Models.Category { Name = "Кор", Description = "Корҳои рӯзонаи офис" };
        var home = new Models.Category { Name = "Хона", Description = "Корҳои хонагӣ" };
        var study = new Models.Category { Name = "Таҳсил", Description = "Корҳои таҳсилӣ" };

        db.Categories.AddRange(work, home, study);
        db.SaveChanges();

        db.ToDos.AddRange(
            new Models.ToDo { Title = "Қабли муштариён", Description = "10 муштарӣро занг зан", Completed = false, CategoryId = work.Id },
            new Models.ToDo { Title = "Гузоштани ҳисобот", Description = "Ҳисоботи моҳонаро тайёр кун", Completed = true, CategoryId = work.Id },
            new Models.ToDo { Title = "Хариди озуқа", Description = "Аз бозор озуқа гир", Completed = false, CategoryId = home.Id },
            new Models.ToDo { Title = "Тоза кардани хона", Description = "Хонаро тоза кун", Completed = false, CategoryId = home.Id },
            new Models.ToDo { Title = "Хондани китоб", Description = "Боби 5-ро хон", Completed = false, CategoryId = study.Id },
            new Models.ToDo { Title = "Навиштани эссе", Description = "Эссеи фалсафаро навис", Completed = false, CategoryId = study.Id },
            new Models.ToDo { Title = "Қабли муоина", Description = "Ба духтур қабл шав", Completed = true, CategoryId = home.Id },
            new Models.ToDo { Title = "Презентатсия", Description = "Слайдҳоро тайёр кун", Completed = false, CategoryId = work.Id },
            new Models.ToDo { Title = "Қабли ҳамкорон", Description = "Ба ҳамкорон email фирист", Completed = true, CategoryId = work.Id },
            new Models.ToDo { Title = "Тамрин кун", Description = "Тамрини риёзӣ", Completed = false, CategoryId = study.Id },
            new Models.ToDo { Title = "Об нуш", Description = "Рӯзона 8 истакон об", Completed = true, CategoryId = home.Id },
            new Models.ToDo { Title = "Код навис", Description = "Лоиҳаи навро соз", Completed = false, CategoryId = work.Id }
        );
        db.SaveChanges();
    }
}
