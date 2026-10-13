from flask import Blueprint, g

from appname.function.tags import CreateTag, DeleteTag, ListTags, RenameTag
from appname.helpers.response import fail, respond
from appname.helpers.validation import get_json_body
from appname.middleware.jwt_middleware import jwt_required

tags_bp = Blueprint("tags", __name__)


def _invalid_body():
    return respond(fail(400, "common.invalid_json", "Request body must be a JSON object"))


@tags_bp.get("")
@jwt_required
def list_tags():
    return respond(ListTags(g.user_id))


@tags_bp.post("")
@jwt_required
def create_tag():
    body = get_json_body()
    if body is None:
        return _invalid_body()
    return respond(CreateTag(g.user_id, body), success_status=201)


@tags_bp.patch("/<tag_id>")
@jwt_required
def rename_tag(tag_id):
    body = get_json_body()
    if body is None:
        return _invalid_body()
    return respond(RenameTag(g.user_id, tag_id, body))


@tags_bp.delete("/<tag_id>")
@jwt_required
def delete_tag(tag_id):
    return respond(DeleteTag(g.user_id, tag_id))
