# Generated for the self-evaluation workflow.

import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


def populate_legacy_self_evaluation_answer_keys(apps, schema_editor):
    SelfEvaluationAnswer = apps.get_model("evaluations", "SelfEvaluationAnswer")
    for answer in SelfEvaluationAnswer.objects.filter(question_key="").order_by("id"):
        answer.question_key = f"legacy_answer_{answer.id}"
        if not answer.section_key:
            answer.section_key = "legacy"
        if not answer.section_title:
            answer.section_title = "Anciennes reponses"
        if not answer.question_text:
            criterion_name = getattr(answer.criterion, "name", "") if answer.criterion_id else ""
            answer.question_text = criterion_name or f"Ancienne reponse {answer.id}"
        answer.save(update_fields=["question_key", "section_key", "section_title", "question_text"])


class Migration(migrations.Migration):

    dependencies = [
        ("evaluations", "0004_auditevent"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name="selfevaluation",
            name="evaluation",
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="self_evaluation",
                to="evaluations.evaluation",
            ),
        ),
        migrations.AddField(
            model_name="selfevaluation",
            name="campaign",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="self_evaluations",
                to="evaluations.evaluationcampaign",
            ),
        ),
        migrations.AddField(
            model_name="selfevaluation",
            name="collaboration_comment",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="selfevaluation",
            name="difficulties",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="selfevaluation",
            name="improvement_suggestions",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="selfevaluation",
            name="integrated_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="selfevaluation",
            name="period",
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name="selfevaluation",
            name="positive_points",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="selfevaluation",
            name="reviewed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="selfevaluation",
            name="reviewed_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="reviewed_self_evaluations",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="selfevaluation",
            name="status",
            field=models.CharField(
                choices=[
                    ("draft", "Draft"),
                    ("submitted", "Submitted"),
                    ("reviewed", "Reviewed"),
                    ("integrated", "Integrated into evaluation process"),
                ],
                default="draft",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="selfevaluation",
            name="support_needs",
            field=models.TextField(blank=True),
        ),
        migrations.AlterUniqueTogether(
            name="selfevaluationanswer",
            unique_together=set(),
        ),
        migrations.AlterModelOptions(
            name="selfevaluationanswer",
            options={"ordering": ("section_key", "id")},
        ),
        migrations.AlterField(
            model_name="selfevaluationanswer",
            name="criterion",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="self_answers",
                to="evaluations.evaluationcriterion",
            ),
        ),
        migrations.AlterField(
            model_name="selfevaluationanswer",
            name="score",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True),
        ),
        migrations.AddField(
            model_name="selfevaluationanswer",
            name="answer_type",
            field=models.CharField(
                choices=[
                    ("rating", "Rating"),
                    ("select", "Select"),
                    ("yes_no", "Yes/No"),
                    ("text", "Text"),
                ],
                default="rating",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="selfevaluationanswer",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="selfevaluationanswer",
            name="is_required",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="selfevaluationanswer",
            name="question_key",
            field=models.CharField(default="", max_length=80),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="selfevaluationanswer",
            name="question_text",
            field=models.TextField(default=""),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="selfevaluationanswer",
            name="section_key",
            field=models.CharField(default="", max_length=80),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="selfevaluationanswer",
            name="section_title",
            field=models.CharField(default="", max_length=255),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="selfevaluationanswer",
            name="selected_value",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="selfevaluationanswer",
            name="updated_at",
            field=models.DateTimeField(auto_now=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.RunPython(populate_legacy_self_evaluation_answer_keys, migrations.RunPython.noop),
        migrations.AlterUniqueTogether(
            name="selfevaluationanswer",
            unique_together={("self_evaluation", "question_key")},
        ),
    ]
