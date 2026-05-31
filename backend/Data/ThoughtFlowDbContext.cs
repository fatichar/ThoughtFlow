using Microsoft.EntityFrameworkCore;
using ThoughtFlow.Api.Data.Entities;

namespace ThoughtFlow.Api.Data;

public sealed class ThoughtFlowDbContext(DbContextOptions<ThoughtFlowDbContext> options)
    : DbContext(options)
{
    public DbSet<Flow> Flows => Set<Flow>();
    public DbSet<FlowResult> FlowResults => Set<FlowResult>();
    public DbSet<Tag> Tags => Set<Tag>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Flow>(entity =>
        {
            entity.ToTable("flows");
            entity.HasKey(flow => flow.Id);

            entity.Property(flow => flow.Id).HasColumnName("id");
            entity.Property(flow => flow.Slug).HasColumnName("slug").HasColumnType("text").IsRequired();
            entity.Property(flow => flow.Title).HasColumnName("title").HasColumnType("text").IsRequired();
            entity.Property(flow => flow.Description).HasColumnName("description").HasColumnType("text");
            entity.Property(flow => flow.FlowJson).HasColumnName("flow_json").HasColumnType("jsonb").IsRequired();
            entity.Property(flow => flow.IsPublished).HasColumnName("is_published").IsRequired();
            entity.Property(flow => flow.CreatedAt).HasColumnName("created_at").HasColumnType("timestamptz").IsRequired();
            entity.Property(flow => flow.UpdatedAt).HasColumnName("updated_at").HasColumnType("timestamptz").IsRequired();

            entity.HasIndex(flow => flow.Slug).IsUnique();
        });

        modelBuilder.Entity<FlowResult>(entity =>
        {
            entity.ToTable("flow_results");
            entity.HasKey(result => result.Id);

            entity.Property(result => result.Id).HasColumnName("id");
            entity.Property(result => result.FlowId).HasColumnName("flow_id").IsRequired();
            entity.Property(result => result.PathJson).HasColumnName("path_json").HasColumnType("jsonb").IsRequired();
            entity.Property(result => result.FinalNodeId).HasColumnName("final_node_id").HasColumnType("text").IsRequired();
            entity.Property(result => result.CreatedAt).HasColumnName("created_at").HasColumnType("timestamptz").IsRequired();
            entity.Property(result => result.UserAgent).HasColumnName("user_agent").HasColumnType("text");
            entity.Property(result => result.Referrer).HasColumnName("referrer").HasColumnType("text");

            entity
                .HasOne(result => result.Flow)
                .WithMany(flow => flow.Results)
                .HasForeignKey(result => result.FlowId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(result => result.FlowId);
            entity.HasIndex(result => result.CreatedAt);
        });

        modelBuilder.Entity<Tag>(entity =>
        {
            entity.ToTable("tags");
            entity.HasKey(tag => tag.Id);

            entity.Property(tag => tag.Id).HasColumnName("id");
            entity.Property(tag => tag.Name).HasColumnName("name").HasColumnType("text").IsRequired();
            entity.Property(tag => tag.Color).HasColumnName("color").HasColumnType("text").IsRequired();
            entity.Property(tag => tag.CreatedAt).HasColumnName("created_at").HasColumnType("timestamptz").IsRequired();

            entity.HasIndex(tag => tag.Name).IsUnique();
        });

        modelBuilder.Entity<Flow>()
            .HasMany(f => f.Tags)
            .WithMany(t => t.Flows)
            .UsingEntity(
                "flow_tags",
                l => l.HasOne(typeof(Tag)).WithMany().HasForeignKey("tag_id").HasPrincipalKey(nameof(Tag.Id)),
                r => r.HasOne(typeof(Flow)).WithMany().HasForeignKey("flow_id").HasPrincipalKey(nameof(Flow.Id)),
                j => j.HasKey("flow_id", "tag_id"));
    }
}
