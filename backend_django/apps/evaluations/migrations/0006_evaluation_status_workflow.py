from django.db import migrations, models


def forwards(apps, schema_editor):
    Evaluation = apps.get_model("evaluations", "Evaluation")
    Evaluation.objects.filter(status="validated").update(status="hr_validated")


def backwards(apps, schema_editor):
    Evaluation = apps.get_model("evaluations", "Evaluation")
    Evaluation.objects.filter(status="hr_validated").update(status="validated")


class Migration(migrations.Migration):

    dependencies = [
        ("evaluations", "0005_self_evaluation_workflow"),
    ]

    operations = [
        migrations.AlterField(
            model_name="evaluation",
            name="status",
            field=models.CharField(
                choices=[
                    ("draft", "Draft"),
                    ("in_progress", "In progress"),
                    ("submitted", "Submitted"),
                    ("manager_validated", "Manager validated"),
                    ("hr_validated", "HR validated"),
                    ("rejected", "Rejected"),
                ],
                default="draft",
                max_length=20,
            ),
        ),
        migrations.RunPython(forwards, backwards),
    ]
