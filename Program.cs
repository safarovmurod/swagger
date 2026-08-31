using Microsoft.EntityFrameworkCore;
using ToDoApi.Data;

var builder = WebApplication.CreateBuilder(args);

// ============================================================
// 1. DATABASE (InMemory — барои тест осон, баҷаҳои воқеиро иваз кун)
// ============================================================
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseInMemoryDatabase("ToDoDb"));

// ============================================================
// 2. SWAGGER — ҳама настройка дар як ҷой
// ============================================================
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "ToDo WebApi",
        Version = "v1.0",
        Description = "API барои идораи корҳо ва категорияҳо — GET, POST, PUT, DELETE, Search, Pagination",
        Contact = new Microsoft.OpenApi.Models.OpenApiContact
        {
            Name = "Softclub",
            Url = new Uri("https://softclub.tj")
        }
    });

    // JWT Auth дар Swagger
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Description = "JWT токенро ворид кун: Bearer {token}",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });

    // XML комментҳоро дохил кун
    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
        c.IncludeXmlComments(xmlPath);
});

// ============================================================
// 3. CONTROLLERS + CORS
// ============================================================
builder.Services.AddControllers();
builder.Services.AddCors(opt => opt.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

// ============================================================
// 4. SEED DATA — маълумоти тестӣ
// ============================================================
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    SeedData.Init(db);
}

// ============================================================
// 5. MIDDLEWARE
// ============================================================
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "ToDo WebApi v1");
        c.DocExpansion(Swashbuckle.AspNetCore.SwaggerUI.DocExpansion.None); // ҳама пӯшида
        c.DisplayRequestDuration(); // вакти дархостро нишон бидеҳ
    });
}

app.UseCors();
app.UseAuthorization();
app.MapControllers();

// Redirect / → /swagger
app.MapGet("/", () => Results Redirect("/swagger"));

app.Run();
