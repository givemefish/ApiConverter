using System.Text.Encodings.Web;
using ApiConverter.Code;
using ApiConverter.Services;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews()
    .AddJsonOptions(options => { options.JsonSerializerOptions.Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping; });

builder.Services.Scan(scan => scan.FromTypes(typeof(DbContext))
    .AsSelf()
    .WithScopedLifetime());

builder.Services.Scan(scan => scan.FromCallingAssembly()
    .AddClasses(cls => cls.InNamespaces("ApiConverter.Services"))
    .AsImplementedInterfaces()
    .WithScopedLifetime());

builder.Services.AddHttpContextAccessor();

//builder.Services.ValidateConnectionStrings()
//    .ValidateOnStart();

WebApplication app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
}

app.UseStaticFiles();

app.UseRouting();

app.UseAuthorization();

app.MapControllerRoute(
    "default",
    "{controller=Document}/{action=Index}/{id?}");

app.Run();