from appname.datas.tags import dataCreateTag, dataDeleteTag, dataListTags, dataRenameTag
from appname.helpers.response import db_fail, fail, ok
from appname.helpers.validation import TAG_NAME_MAX, clean_text, is_uuid


def _clean_tag_name(value):
    valid, name = clean_text(value, TAG_NAME_MAX, required=True)
    return name if valid else None


def ListTags(user_id):
    err_code, err_msg, tags = dataListTags(user_id)
    if err_code:
        return db_fail(err_code, err_msg)
    return ok("Success ListTags", tags)


def CreateTag(user_id, body):
    name = _clean_tag_name(body.get("name"))
    if not name:
        return fail(400, "tags.name_invalid", f"Tag name must be 1–{TAG_NAME_MAX} characters")
    err_code, err_msg, tag = dataCreateTag(user_id, name)
    if err_code == 409:
        return fail(409, "tags.exists", "You already have a tag with this name")
    if err_code:
        return db_fail(err_code, err_msg)
    return ok("Success CreateTag", tag)


def RenameTag(user_id, tag_id, body):
    if not is_uuid(tag_id):
        return fail(404, "tags.not_found", "Tag not found")
    name = _clean_tag_name(body.get("name"))
    if not name:
        return fail(400, "tags.name_invalid", f"Tag name must be 1–{TAG_NAME_MAX} characters")
    err_code, err_msg, tag = dataRenameTag(user_id, tag_id, name)
    if err_code == 409:
        return fail(409, "tags.exists", "You already have a tag with this name")
    if err_code:
        return db_fail(err_code, err_msg)
    if tag is None:
        return fail(404, "tags.not_found", "Tag not found")
    return ok("Success RenameTag", tag)


def DeleteTag(user_id, tag_id):
    if not is_uuid(tag_id):
        return fail(404, "tags.not_found", "Tag not found")
    err_code, err_msg, deleted = dataDeleteTag(user_id, tag_id)
    if err_code:
        return db_fail(err_code, err_msg)
    if not deleted:
        return fail(404, "tags.not_found", "Tag not found")
    return ok("Success DeleteTag", {"id": tag_id})
