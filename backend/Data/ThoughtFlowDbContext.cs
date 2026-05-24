using Microsoft.EntityFrameworkCore;
using ThoughtFlow.Api.Data.Entities;

namespace ThoughtFlow.Api.Data;

public sealed class ThoughtFlowDbContext(DbContextOptions<ThoughtFlowDbContext> options)
    : DbContext(options)
{
    public DbSet<Flow> Flows => Set<Flow>();
    public DbSet<FlowResult> FlowResults => Set<FlowResult>();

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
    }
}
